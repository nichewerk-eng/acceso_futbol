import { peekCache, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  isNearKickoff,
  looksStillLive,
  paceFromFixtures,
} from './freshness';
import { mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import type { GoleoBoard, GoleoEntry } from './leaders';
import {
  fetchFixturesByDate,
  fetchLigaMxFemenilSeasonFixtures,
  fetchLivescores,
  ligaMxFemenilLeagueId,
  overlayLiveFixtures,
  sportmonksEnabled,
} from './sportmonks';
import type { Fixture } from './types';

const BOARD_KEY = 'liga-mx-femenil-board-v1';
const GOLEO_KEY = 'liga-mx-femenil-goleo-v1';
const GOLEO_TTL_MS = 45_000;
const DATE_BOARD_PAST_MS = 36 * 3600_000;
const DATE_BOARD_FUTURE_MS = 8 * 86400_000;

type FemenilBoard = { fixtures: Fixture[]; source: 'sportmonks' | 'empty' };

function utcKeysForMexicoDays(days: Iterable<string>): string[] {
  const keys = new Set<string>();
  for (const d of days) {
    keys.add(d);
    keys.add(shiftDayKey(d, 1));
  }
  return [...keys];
}

function mergeById(rows: Fixture[]): Fixture[] {
  const byId = new Map<string, Fixture>();
  for (const f of rows) byId.set(f.id, f);
  return [...byId.values()].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

async function fetchDateBoard(seed: Fixture[], pastMs: number): Promise<Fixture[]> {
  const now = Date.now();
  const days = new Set<string>();
  const today = mexicoDayKey(new Date(now));
  days.add(shiftDayKey(today, -1));
  days.add(today);
  days.add(shiftDayKey(today, 1));
  days.add(shiftDayKey(today, 2));
  for (const f of seed) {
    const t = +new Date(f.date);
    if (!Number.isFinite(t)) continue;
    if (t < now - pastMs || t > now + DATE_BOARD_FUTURE_MS) continue;
    days.add(mexicoDayKey(new Date(f.date)));
  }
  const boards = await Promise.all(
    utcKeysForMexicoDays(days).map((k) =>
      fetchFixturesByDate(k, [ligaMxFemenilLeagueId()]).catch(() => [] as Fixture[])
    )
  );
  return boards.flat();
}

/**
 * Liga MX Femenil board — Sportmonks season + nearby date windows + its own
 * livescores filter. Does not share the Liga MX living-room cache key.
 */
export async function fetchLigaMxFemenilFixtures(): Promise<FemenilBoard> {
  const prev = peekCache<FemenilBoard>(BOARD_KEY);
  const pace = prev ? paceFromFixtures(prev.fixtures) : 'near';
  return singleFlight(BOARD_KEY, apiTtlMsForPace(pace), buildFemenilBoard);
}

async function buildFemenilBoard(): Promise<FemenilBoard> {
  if (!sportmonksEnabled()) return { fixtures: [], source: 'empty' };
  try {
    const season = await fetchLigaMxFemenilSeasonFixtures().catch(() => [] as Fixture[]);
    const near = await fetchDateBoard(season, DATE_BOARD_PAST_MS).catch(() => [] as Fixture[]);
    const dated = mergeById([...season, ...near]);
    const now = Date.now();
    const mayBeLive = dated.some(
      (f) => looksStillLive(f) || isNearKickoff(f.date, now, f.state)
    );
    const live = mayBeLive
      ? (await fetchLivescores([ligaMxFemenilLeagueId()]).catch(() => [] as Fixture[])).filter(
          (f) => f.league === 'liga-mx-femenil'
        )
      : [];
    const fixtures = live.length ? overlayLiveFixtures(dated, live) : dated;
    return { fixtures, source: fixtures.length ? 'sportmonks' : 'empty' };
  } catch {
    return { fixtures: [], source: 'empty' };
  }
}

function goleoFromScorers(fixtures: Fixture[]): GoleoEntry[] {
  const byKey = new Map<string, GoleoEntry>();
  for (const f of fixtures) {
    for (const s of f.scorers ?? []) {
      if (s.og) continue;
      const team = s.side === 'home' ? f.home : f.away;
      const key = `${s.name.trim().toLowerCase()}|${team.abbreviation}`;
      const prev = byKey.get(key);
      if (prev) {
        prev.value += 1;
        continue;
      }
      byKey.set(key, {
        rank: 0,
        athleteId: key,
        name: s.name,
        teamAbbr: team.abbreviation,
        teamName: team.name,
        teamLogo: team.logo,
        value: 1,
      });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, 15)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export async function fetchLigaMxFemenilLeaders(): Promise<GoleoBoard | null> {
  return singleFlight(GOLEO_KEY, GOLEO_TTL_MS, async () => {
    const { fixtures } = await fetchLigaMxFemenilFixtures();
    const goals = goleoFromScorers(fixtures);
    return {
      seasonLabel: 'Apertura 2026',
      goals,
      assists: [],
      generatedAt: new Date().toISOString(),
    };
  });
}
