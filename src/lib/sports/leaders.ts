import { singleFlight } from '@/lib/apiCache';
import { espnFetch } from '@/lib/espn';
import { fetchLigaMxFixtures } from './espnFallback';
import { FRESH } from './freshness';
import type { Fixture, TeamRef } from './types';

// Apertura 2026 = ESPN season year 2026, season type 1. Bump when the torneo rolls.
const SEASON_YEAR = 2026;
const SEASON_TYPE = 1;
const ESPN_LEADERS_KEY = 'liga-mx-goleo-espn-v2';

interface EspnRef {
  $ref?: string;
}
interface EspnLeader {
  displayValue?: string;
  value?: number;
  athlete?: EspnRef;
  team?: EspnRef;
}
interface EspnCategory {
  name?: string;
  leaders?: EspnLeader[];
}
interface EspnLeadersIndex {
  categories?: EspnCategory[];
}
interface EspnAthlete {
  id?: string | number;
  displayName?: string;
  position?: { abbreviation?: string };
}
interface EspnTeam {
  abbreviation?: string;
  displayName?: string;
  logos?: { href?: string }[];
}

export interface GoleoEntry {
  rank: number;
  athleteId: string;
  name: string;
  position?: string;
  teamAbbr?: string;
  teamName?: string;
  teamLogo?: string;
  /** Goals or assists, depending on the board. */
  value: number;
  games?: number;
}

export interface GoleoBoard {
  seasonLabel: string;
  goals: GoleoEntry[];
  assists: GoleoEntry[];
  generatedAt: string;
}

type TeamLite = { abbreviation?: string; displayName?: string; logo?: string };

function coreLeadersUrl(): string {
  return `https://sports.core.api.espn.com/v2/sports/soccer/leagues/mex.1/seasons/${SEASON_YEAR}/types/${SEASON_TYPE}/leaders?lang=es`;
}

function httpsify(url: string): string {
  return url.replace(/^http:\/\//, 'https://');
}

async function getJson<T>(url: string, revalidate: number | false = 45): Promise<T | null> {
  try {
    return (await espnFetch(httpsify(url), { revalidate })) as T;
  } catch {
    return null;
  }
}

async function resolveTeam(ref: string, cache: Map<string, TeamLite>): Promise<TeamLite> {
  const key = httpsify(ref);
  const hit = cache.get(key);
  if (hit) return hit;
  const t = await getJson<EspnTeam>(key, 3600);
  const val: TeamLite = {
    abbreviation: t?.abbreviation,
    displayName: t?.displayName,
    logo: t?.logos?.[0]?.href,
  };
  cache.set(key, val);
  return val;
}

function parseGames(displayValue?: string): number | undefined {
  const m = displayValue?.match(/Partidos:\s*(\d+)/i);
  return m ? Number(m[1]) : undefined;
}

async function buildEntries(
  cat: EspnCategory | undefined,
  limit: number,
  teamCache: Map<string, TeamLite>
): Promise<GoleoEntry[]> {
  const leaders = (cat?.leaders ?? []).slice(0, limit);
  const rows = await Promise.all(
    leaders.map(async (l, i): Promise<GoleoEntry | null> => {
      const [athlete, team] = await Promise.all([
        l.athlete?.$ref ? getJson<EspnAthlete>(l.athlete.$ref, 3600) : Promise.resolve(null),
        l.team?.$ref ? resolveTeam(l.team.$ref, teamCache) : Promise.resolve<TeamLite>({}),
      ]);
      const name = athlete?.displayName;
      if (!name) return null;
      return {
        rank: i + 1,
        athleteId: String(athlete?.id ?? ''),
        name,
        position: athlete?.position?.abbreviation,
        teamAbbr: team.abbreviation,
        teamName: team.displayName,
        teamLogo: team.logo,
        value: typeof l.value === 'number' ? l.value : Number(l.value) || 0,
        games: parseGames(l.displayValue),
      };
    })
  );
  return rows.filter((r): r is GoleoEntry => r !== null);
}

function foldName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
}

export function leaderKey(name: string, teamAbbr?: string): string {
  const parts = foldName(name).split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  return `${last}|${(teamAbbr ?? '').toUpperCase()}`;
}

function usableName(name: string): boolean {
  const n = name.trim();
  if (n.length < 3) return false;
  return !/^(gol|goal|own\s*goal|autogol)$/i.test(n);
}

function rankList(rows: GoleoEntry[], limit: number): GoleoEntry[] {
  return [...rows]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

function bump(rows: GoleoEntry[], name: string, team: TeamRef, n = 1): GoleoEntry[] {
  if (!usableName(name) || n < 1) return rows;
  const key = leaderKey(name, team.abbreviation);
  const next = rows.map((e) => ({ ...e }));
  const hit = next.find((e) => leaderKey(e.name, e.teamAbbr) === key);
  if (hit) {
    hit.value += n;
    return next;
  }
  next.push({
    rank: 0,
    athleteId: key,
    name,
    teamAbbr: team.abbreviation,
    teamName: team.name,
    teamLogo: team.logo,
    value: n,
  });
  return next;
}

/**
 * ESPN season totals lag while a match is on. Add in-play scorers/assists
 * from the shared Liga MX board so AF://GOLES moves with the tablero.
 */
export function overlayLiveLeaders(board: GoleoBoard, fixtures: Fixture[]): GoleoBoard {
  const live = fixtures.filter((f) => f.state === 'in');
  if (!live.length) return board;

  let goals = board.goals;
  let assists = board.assists;
  for (const f of live) {
    for (const s of f.scorers ?? []) {
      if (s.og) continue;
      const team = s.side === 'home' ? f.home : f.away;
      goals = bump(goals, s.name, team);
    }
    for (const s of f.assists ?? []) {
      const team = s.side === 'home' ? f.home : f.away;
      assists = bump(assists, s.name, team);
    }
  }

  return {
    ...board,
    goals: rankList(goals, Math.max(15, board.goals.length)),
    assists: rankList(assists, Math.max(10, board.assists.length)),
    generatedAt: new Date().toISOString(),
  };
}

async function fetchEspnLeaders(): Promise<GoleoBoard | null> {
  const index = await getJson<EspnLeadersIndex>(coreLeadersUrl(), 45);
  if (!index) return null;
  const cats = index.categories ?? [];
  const teamCache = new Map<string, TeamLite>();
  const [goals, assists] = await Promise.all([
    buildEntries(
      cats.find((c) => c.name === 'goalsLeaders'),
      15,
      teamCache
    ),
    buildEntries(
      cats.find((c) => c.name === 'assistsLeaders'),
      10,
      teamCache
    ),
  ]);
  return {
    seasonLabel: `Apertura ${SEASON_YEAR}`,
    goals,
    assists,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Liga MX scoring + assist leaders from ESPN, plus in-play overlay from the
 * shared board. ESPN index is cached ~45s; overlay runs on every call.
 */
export async function fetchLigaMxLeaders(): Promise<GoleoBoard | null> {
  const espn = await singleFlight(ESPN_LEADERS_KEY, FRESH.standingsTtlMs, fetchEspnLeaders);
  if (!espn) return null;
  try {
    const { fixtures } = await fetchLigaMxFixtures();
    return overlayLiveLeaders(espn, fixtures);
  } catch {
    return espn;
  }
}
