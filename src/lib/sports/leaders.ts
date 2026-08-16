import { singleFlight } from '@/lib/apiCache';
import { espnFetch } from '@/lib/espn';

// Apertura 2026 = ESPN season year 2026, season type 1. Bump when the torneo rolls.
const SEASON_YEAR = 2026;
const SEASON_TYPE = 1;
const LEADERS_KEY = 'liga-mx-goleo-v1';
const TTL_MS = 20 * 60_000;

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

async function getJson<T>(url: string): Promise<T | null> {
  try {
    return (await espnFetch(httpsify(url), { revalidate: 900 })) as T;
  } catch {
    return null;
  }
}

async function resolveTeam(ref: string, cache: Map<string, TeamLite>): Promise<TeamLite> {
  const key = httpsify(ref);
  const hit = cache.get(key);
  if (hit) return hit;
  const t = await getJson<EspnTeam>(key);
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
        l.athlete?.$ref ? getJson<EspnAthlete>(l.athlete.$ref) : Promise.resolve(null),
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

/**
 * Liga MX scoring + assist leaders from ESPN's core API. Athlete/team come back
 * as `$ref` links, so we hydrate the top N and cache the assembled board (KV + memory).
 * Returns null only on a hard fetch failure of the index.
 */
export function fetchLigaMxLeaders(): Promise<GoleoBoard | null> {
  return singleFlight(LEADERS_KEY, TTL_MS, async () => {
    const index = await getJson<EspnLeadersIndex>(coreLeadersUrl());
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
  });
}
