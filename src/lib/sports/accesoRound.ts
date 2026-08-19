import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import {
  accesoIndex,
  leaguePpgStats,
  pickAccesoXi,
  ppgToOpp,
  shrinkOpp,
  teamPerformanceScore,
  type AccesoBand,
} from '@/lib/sports/accesoIndex';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import { LIGA_MX_SM_TEAM_BY_ABBR } from '@/lib/sports/ligaMxTeams';
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
  if (!path || /placeholder/i.test(path)) return undefined;
  return path;
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

function sidesOf(fx: SmRoundFixture): {
  homeId: number | null;
  awayId: number | null;
  homeAbbr: string;
  awayAbbr: string;
  homeScore: number;
  awayScore: number;
} {
  const parts = fx.participants ?? [];
  const homeP = parts.find((p) => p.meta?.location !== 'away') ?? parts[0];
  const awayP = parts.find((p) => p.meta?.location === 'away') ?? parts[1];
  const homeAbbr = abbrFromTeamId(homeP?.id) || scheduleAbbr(homeP?.short_code ?? 'LOC');
  const awayAbbr = abbrFromTeamId(awayP?.id) || scheduleAbbr(awayP?.short_code ?? 'VIS');
  return {
    homeId: homeP?.id ?? null,
    awayId: awayP?.id ?? null,
    homeAbbr: clubIdentityFromAbbr(homeAbbr)?.abbreviation ?? homeAbbr,
    awayAbbr: clubIdentityFromAbbr(awayAbbr)?.abbreviation ?? awayAbbr,
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

export async function buildAccesoRoundXi(
  roundId: number,
  jornada: number
): Promise<AccesoRoundXi | null> {
  const [fixtures, standings] = await Promise.all([
    fetchRoundFixtures(roundId),
    fetchLigaMxStandings().catch(() => ({ entries: [] as SmStandingEntry[] })),
  ]);
  const opp = oppMap(standings.entries, jornada);
  const pool: Eligible[] = [];

  for (const fx of fixtures) {
    const sides = sidesOf(fx);
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

  const picked = pickAccesoXi(pool);
  if (!picked) return null;

  const players: AccesoRoundPlayer[] = picked.players.map((p) => ({
    ...p,
    formation: picked.formation,
    rank: 0,
  }));
  const ranking = [...players].sort((a, b) => b.acceso - a.acceso);
  ranking.forEach((p, i) => {
    p.rank = i + 1;
  });
  return {
    formation: picked.formation,
    players: [...players].sort((a, b) => a.slot - b.slot),
  };
}
