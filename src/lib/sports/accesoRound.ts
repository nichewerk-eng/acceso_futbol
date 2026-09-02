import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import {
  accesoIndex,
  jornadaTeamScore,
  leaguePpgStats,
  pickAccesoXi,
  ppgToOpp,
  shrinkOpp,
  teamPerformanceScore,
  type AccesoBand,
} from '@/lib/sports/accesoIndex';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import { LIGA_MX_SM_TEAM_BY_ABBR } from '@/lib/sports/ligaMxTeams';
import { fillMissingPlayerPhotos, usablePlayerPhoto } from '@/lib/sports/playerFaces';
import { smFetch } from '@/lib/sports/sm/client';
import { fetchLigaMxStandings, type SmStandingEntry } from '@/lib/sports/sportmonks';
import type { LineupPos } from '@/lib/sports/types';

const ROUND_XI_KEY = (roundId: number) => `sm-acceso-round-v1-${roundId}`;
const ROUND_XI_TTL_MS = 24 * 60 * 60_000;
const ROUND_INCLUDE =
  'fixtures.lineups.player;fixtures.lineups.details.type;fixtures.participants;fixtures.scores';

const ABBR_BY_SM_ID: Record<number, string> = Object.fromEntries(
  Object.entries(LIGA_MX_SM_TEAM_BY_ABBR).map(([abbr, id]) => [id, abbr])
);

const STARTER_TYPE = 11;

type SmDetail = {
  type_id?: number;
  value?: { value?: string | number } | string | number;
  data?: { value?: string | number };
  type?: { id?: number; code?: string; name?: string; developer_name?: string };
};

type SmLineup = {
  player_id?: number;
  team_id?: number;
  fixture_id?: number;
  type_id?: number;
  position_id?: number;
  player_name?: string;
  player?: {
    id?: number;
    display_name?: string;
    name?: string;
    common_name?: string;
    image_path?: string;
  };
  details?: SmDetail[];
};

type SmParticipant = {
  id?: number;
  name?: string;
  short_code?: string;
  meta?: { location?: string; winner?: boolean };
};

type SmScore = {
  description?: string;
  score?: { goals?: number | null; participant?: string };
};

type SmRoundFixture = {
  id?: number;
  participants?: SmParticipant[];
  scores?: SmScore[];
  lineups?: SmLineup[];
};

type Eligible = {
  id: string;
  name: string;
  shortName: string;
  photo?: string;
  smRating: number;
  teamScore: number;
  acceso: number;
  position: LineupPos;
  teamAbbr: string;
  teamName: string;
  fixtureId: string;
};

function foldNum(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  if (raw && typeof raw === 'object' && 'value' in raw) {
    return foldNum((raw as { value?: unknown }).value);
  }
  return null;
}

function detailValue(details: SmDetail[] | undefined, match: (d: SmDetail) => boolean): number | null {
  for (const d of details ?? []) {
    if (!match(d)) continue;
    const n = foldNum(d.data ?? d.value);
    if (n != null) return n;
  }
  return null;
}

function ratingOf(row: SmLineup): number | null {
  return detailValue(
    row.details,
    (d) =>
      d.type_id === 118 ||
      d.type?.id === 118 ||
      (d.type?.code || d.type?.developer_name || '').toLowerCase() === 'rating'
  );
}

function minutesOf(row: SmLineup): number | null {
  return detailValue(row.details, (d) => {
    const code = (d.type?.code || d.type?.developer_name || d.type?.name || '').toLowerCase();
    return code === 'minutes' || code.includes('minute');
  });
}

function isEligible(row: SmLineup): boolean {
  if (ratingOf(row) == null) return false;
  if (row.type_id === STARTER_TYPE) return true;
  const mins = minutesOf(row);
  return mins != null && mins >= 60;
}

function mapPosition(positionId?: number): LineupPos {
  switch (positionId) {
    case 24:
      return 'GK';
    case 25:
      return 'DEF';
    case 26:
      return 'MID';
    case 27:
    case 28:
      return 'FWD';
    default:
      return '?';
  }
}

function playerPhoto(path?: string | null): string | undefined {
  return usablePlayerPhoto(path);
}

function displayName(row: SmLineup): string {
  return (
    row.player?.display_name ||
    row.player?.name ||
    row.player_name ||
    row.player?.common_name ||
    'Jugador'
  );
}

function lastName(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || raw;
}

function abbrFromTeamId(teamId?: number): string {
  if (teamId == null) return '';
  const raw = ABBR_BY_SM_ID[teamId];
  if (!raw) return '';
  const club = clubIdentityFromAbbr(scheduleAbbr(raw));
  return club?.abbreviation ?? scheduleAbbr(raw);
}

function scoreFor(scores: SmScore[] | undefined, side: 'home' | 'away'): number | null {
  if (!scores?.length) return null;
  const bySide = scores.filter((x) => (x.score?.participant ?? '').toLowerCase() === side);
  if (!bySide.length) return null;
  const preferred =
    bySide.find((x) => (x.description ?? '').toUpperCase() === 'CURRENT') ??
    bySide.find((x) => (x.description ?? '').toUpperCase() === '2ND_HALF') ??
    bySide[bySide.length - 1];
  const g = preferred?.score?.goals;
  return g != null && Number.isFinite(Number(g)) ? Number(g) : null;
}

function nameOf(abbr: string, fallback: string): string {
  return clubIdentityFromAbbr(abbr)?.name ?? fallback;
}

function sidesOf(fx: SmRoundFixture): {
  homeId: number | null;
  awayId: number | null;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
} {
  const parts = fx.participants ?? [];
  const homeP = parts.find((p) => p.meta?.location !== 'away') ?? parts[0];
  const awayP = parts.find((p) => p.meta?.location === 'away') ?? parts[1];
  const homeAbbr = abbrFromTeamId(homeP?.id) || scheduleAbbr(homeP?.short_code ?? 'LOC');
  const awayAbbr = abbrFromTeamId(awayP?.id) || scheduleAbbr(awayP?.short_code ?? 'VIS');
  const homeCanon = clubIdentityFromAbbr(homeAbbr)?.abbreviation ?? homeAbbr;
  const awayCanon = clubIdentityFromAbbr(awayAbbr)?.abbreviation ?? awayAbbr;
  return {
    homeId: homeP?.id ?? null,
    awayId: awayP?.id ?? null,
    homeAbbr: homeCanon,
    awayAbbr: awayCanon,
    homeName: nameOf(homeCanon, homeP?.name ?? homeCanon),
    awayName: nameOf(awayCanon, awayP?.name ?? awayCanon),
    homeScore: scoreFor(fx.scores, 'home') ?? 0,
    awayScore: scoreFor(fx.scores, 'away') ?? 0,
  };
}

function ppgOf(entry: SmStandingEntry | undefined): number {
  if (!entry) return 1;
  return entry.pts / Math.max(entry.gp, 1);
}

async function fetchRoundFixtures(roundId: number): Promise<SmRoundFixture[]> {
  const key = ROUND_XI_KEY(roundId);
  const hit = getCache<SmRoundFixture[]>(key, ROUND_XI_TTL_MS);
  if (hit) return hit;
  return singleFlight(key, ROUND_XI_TTL_MS, async () => {
    const data = await smFetch<{ data?: { fixtures?: SmRoundFixture[] } }>(
      `/rounds/${roundId}`,
      { include: ROUND_INCLUDE },
      'catalog'
    );
    const rows = data.data?.fixtures ?? [];
    setCache(key, rows);
    return rows;
  });
}

function oppMap(entries: SmStandingEntry[], jornada: number): Map<string, number> {
  const ppgs = entries.map(ppgOf);
  const { mean, sd } = leaguePpgStats(ppgs);
  const out = new Map<string, number>();
  for (const e of entries) {
    const abbr = clubIdentityFromAbbr(e.team.abbreviation)?.abbreviation ?? e.team.abbreviation;
    out.set(abbr, shrinkOpp(ppgToOpp(ppgOf(e), mean, sd), jornada));
  }
  return out;
}

export type AccesoRoundPlayer = Eligible & { slot: number; rank: number; formation: string };

export type AccesoRoundXi = {
  formation: string;
  players: AccesoRoundPlayer[];
};

export type AccesoRoundTeam = {
  abbr: string;
  name: string;
  score: number;
  result: 'W' | 'D' | 'L';
  gf: number;
  ga: number;
  home: boolean;
  opponentAbbr: string;
  opponentName: string;
  pos: number | null;
  opponentPos: number | null;
  rank: number;
  why: string;
};

function posMap(entries: SmStandingEntry[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) {
    const abbr = clubIdentityFromAbbr(e.team.abbreviation)?.abbreviation ?? e.team.abbreviation;
    out.set(abbr, e.position);
  }
  return out;
}

function wdlOf(gd: number): 'W' | 'D' | 'L' {
  if (gd > 0) return 'W';
  if (gd < 0) return 'L';
  return 'D';
}

function teamWhy(row: Omit<AccesoRoundTeam, 'rank' | 'why'>): string {
  const score = `${row.gf}–${row.ga}`;
  const vs = row.home ? `vs ${row.opponentAbbr}` : `visita vs ${row.opponentAbbr}`;
  const place =
    row.pos != null && row.opponentPos != null ? ` · ${row.pos}° vs ${row.opponentPos}°` : '';
  if (row.result === 'W') return `Ganó ${score} ${vs}${place}`;
  if (row.result === 'D') return `Empató ${score} ${vs}${place}`;
  return `Perdió ${score} ${vs}${place}`;
}

function teamRow(
  abbr: string,
  nameFallback: string,
  home: boolean,
  gf: number,
  ga: number,
  oppAbbr: string,
  oppNameFallback: string,
  oppStrength: number,
  places: Map<string, number>
): Omit<AccesoRoundTeam, 'rank'> {
  const pos = places.get(abbr) ?? null;
  const opponentPos = places.get(oppAbbr) ?? null;
  const gd = gf - ga;
  const row = {
    abbr,
    name: nameOf(abbr, nameFallback),
    score: jornadaTeamScore({
      home,
      gf,
      ga,
      opp: oppStrength,
      pos,
      oppPos: opponentPos,
    }),
    result: wdlOf(gd),
    gf,
    ga,
    home,
    opponentAbbr: oppAbbr,
    opponentName: nameOf(oppAbbr, oppNameFallback),
    pos,
    opponentPos,
  };
  return { ...row, why: teamWhy(row) };
}

export function rankAccesoRoundTeams(
  sides: {
    homeAbbr: string;
    awayAbbr: string;
    homeName: string;
    awayName: string;
    homeScore: number;
    awayScore: number;
  }[],
  opp: Map<string, number>,
  places: Map<string, number>
): AccesoRoundTeam[] {
  const rows: Omit<AccesoRoundTeam, 'rank'>[] = [];
  for (const s of sides) {
    rows.push(
      teamRow(
        s.homeAbbr,
        s.homeName,
        true,
        s.homeScore,
        s.awayScore,
        s.awayAbbr,
        s.awayName,
        opp.get(s.awayAbbr) ?? 0.5,
        places
      ),
      teamRow(
        s.awayAbbr,
        s.awayName,
        false,
        s.awayScore,
        s.homeScore,
        s.homeAbbr,
        s.homeName,
        opp.get(s.homeAbbr) ?? 0.5,
        places
      )
    );
  }
  const sorted = [...rows].sort(
    (a, b) =>
      b.score - a.score ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.abbr.localeCompare(b.abbr)
  );
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

async function loadAccesoRound(
  roundId: number,
  jornada: number
): Promise<{ xi: AccesoRoundXi | null; teams: AccesoRoundTeam[] }> {
  return singleFlight(`sm-acceso-pack-v3-faces-${roundId}-${jornada}`, ROUND_XI_TTL_MS, () =>
    computeAccesoRound(roundId, jornada)
  );
}

async function computeAccesoRound(
  roundId: number,
  jornada: number
): Promise<{ xi: AccesoRoundXi | null; teams: AccesoRoundTeam[] }> {
  const [fixtures, standings] = await Promise.all([
    fetchRoundFixtures(roundId),
    fetchLigaMxStandings().catch(() => ({ entries: [] as SmStandingEntry[] })),
  ]);
  const opp = oppMap(standings.entries, jornada);
  const places = posMap(standings.entries);
  const pool: Eligible[] = [];
  const matchSides: {
    homeAbbr: string;
    awayAbbr: string;
    homeName: string;
    awayName: string;
    homeScore: number;
    awayScore: number;
  }[] = [];

  for (const fx of fixtures) {
    const sides = sidesOf(fx);
    if (!sides.homeAbbr || !sides.awayAbbr) continue;
    matchSides.push({
      homeAbbr: sides.homeAbbr,
      awayAbbr: sides.awayAbbr,
      homeName: sides.homeName,
      awayName: sides.awayName,
      homeScore: sides.homeScore,
      awayScore: sides.awayScore,
    });
    const fixtureId = String(fx.id ?? '');
    for (const row of fx.lineups ?? []) {
      if (!isEligible(row)) continue;
      const r = ratingOf(row);
      if (r == null) continue;
      const teamAbbr = abbrFromTeamId(row.team_id);
      if (!teamAbbr) continue;
      const home = row.team_id != null && row.team_id === sides.homeId;
      const gd = home ? sides.homeScore - sides.awayScore : sides.awayScore - sides.homeScore;
      const oppAbbr = home ? sides.awayAbbr : sides.homeAbbr;
      const T = teamPerformanceScore(gd, opp.get(oppAbbr) ?? 0.5);
      const A = accesoIndex(r, T);
      const name = displayName(row);
      const club = clubIdentityFromAbbr(teamAbbr);
      const position = mapPosition(row.position_id);
      if (position === '?') continue;
      pool.push({
        id: String(row.player_id ?? row.player?.id ?? `${teamAbbr}-${name}`),
        name,
        shortName: lastName(name),
        photo: playerPhoto(row.player?.image_path),
        smRating: r,
        teamScore: T,
        acceso: A,
        position: position as AccesoBand,
        teamAbbr: club?.abbreviation ?? teamAbbr,
        teamName: club?.name ?? teamAbbr,
        fixtureId,
      });
    }
  }

  const teams = rankAccesoRoundTeams(matchSides, opp, places);
  const picked = pickAccesoXi(pool);
  if (!picked) return { xi: null, teams };

  const withFaces = await fillMissingPlayerPhotos(picked.players);
  const players: AccesoRoundPlayer[] = withFaces.map((p) => ({
    ...p,
    formation: picked.formation,
    rank: 0,
  }));
  const ranking = [...players].sort((a, b) => b.acceso - a.acceso);
  ranking.forEach((p, i) => {
    p.rank = i + 1;
  });
  return {
    xi: {
      formation: picked.formation,
      players: [...players].sort((a, b) => a.slot - b.slot),
    },
    teams,
  };
}

export async function buildAccesoRound(
  roundId: number,
  jornada: number
): Promise<{ xi: AccesoRoundXi | null; teams: AccesoRoundTeam[] }> {
  return loadAccesoRound(roundId, jornada);
}

export async function buildAccesoRoundXi(
  roundId: number,
  jornada: number
): Promise<AccesoRoundXi | null> {
  const packed = await loadAccesoRound(roundId, jornada);
  return packed.xi;
}

export async function buildAccesoRoundTeams(
  roundId: number,
  jornada: number
): Promise<AccesoRoundTeam[]> {
  const packed = await loadAccesoRound(roundId, jornada);
  return packed.teams;
}
