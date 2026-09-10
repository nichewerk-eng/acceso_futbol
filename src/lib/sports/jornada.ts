import { attachDondeVer } from '@/config/dondeVer';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture } from './types';
import { fetchLigaMxFixtures, seedLigaMxFixtures } from './espnFallback';
import { isFixtureHeld, isFixturePostponed } from './localizeEs';

export type JornadaOverview = {
  label: string;
  number: number;
  generatedAt: string;
  source: 'sportmonks' | 'espn' | 'static';
  live: Fixture[];
  played: Fixture[];
  upcoming: Fixture[];
  /** Still this fecha, but no kickoff this weekend (Leagues Cup, etc.). */
  postponed: Fixture[];
};

export function jornadaNumber(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Calendar-day distance between two YYYY-MM-DD keys. */
export function mexicoDayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms = Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!);
  return Math.round(ms / 86_400_000);
}

/**
 * The fecha itself: the densest cluster of kickoffs.
 * A gap of more than 3 Mexico days (makeup after Leagues Cup, etc.) starts
 * a new cluster and drops off the jornada board / quiniela / Dónde ver.
 */
export function jornadaFechaCluster<T extends { date: string }>(games: T[]): T[] {
  if (games.length <= 1) return games;
  const items = games
    .map((g) => {
      try {
        return { g, d: mexicoDayKey(new Date(g.date)) };
      } catch {
        return null;
      }
    })
    .filter((x): x is { g: T; d: string } => Boolean(x?.d))
    .sort((a, b) => a.d.localeCompare(b.d) || +new Date(a.g.date) - +new Date(b.g.date));
  if (!items.length) return games;

  const clusters: { g: T; d: string }[][] = [];
  let cur: { g: T; d: string }[] = [items[0]];
  for (let i = 1; i < items.length; i++) {
    const gap = mexicoDayDiff(cur[cur.length - 1].d, items[i].d);
    if (gap <= 3) cur.push(items[i]);
    else {
      clusters.push(cur);
      cur = [items[i]];
    }
  }
  clusters.push(cur);
  clusters.sort((a, b) => b.length - a.length || a[0].d.localeCompare(b[0].d));
  return clusters[0].map((x) => x.g);
}

export function fixturesOnJornadaFecha(fixtures: Fixture[], n: number): Fixture[] {
  return jornadaFechaCluster(fixtures.filter((f) => jornadaNumber(f.jornada) === n));
}

/** Live, or a real upcoming kickoff (ignore postponed / abandoned / stale). */
function stillOnBoard(f: Fixture, now: Date): boolean {
  if (f.state === 'in') return true;
  if (f.state !== 'pre') return false;
  if (isFixtureHeld(f.statusLabel)) return false;
  return +new Date(f.date) >= +now - 2 * 3600_000;
}

function pickActiveJornada(fixtures: Fixture[], now = new Date()): number | null {
  const dayKey = mexicoDayKey(now);
  const withNum = fixtures
    .map((f) => ({ f, n: jornadaNumber(f.jornada) }))
    .filter((x): x is { f: Fixture; n: number } => x.n != null);

  if (withNum.length === 0) return null;

  const byNum = new Map<number, Fixture[]>();
  for (const { f, n } of withNum) {
    const list = byNum.get(n) ?? [];
    list.push(f);
    byNum.set(n, list);
  }

  const nums = [...byNum.keys()].sort((a, b) => a - b);
  const coreOf = (n: number) => jornadaFechaCluster(byNum.get(n)!);

  // 1) Jornada with a game today or live
  for (const n of nums) {
    const games = coreOf(n);
    if (games.some((g) => g.state === 'in' || isMexicoDay(g.date, dayKey))) return n;
  }

  // 2) Jornada in progress (finished + remaining real fixtures)
  for (const n of nums) {
    const games = coreOf(n);
    const hasPost = games.some((g) => g.state === 'post');
    const hasOpen = games.some((g) => stillOnBoard(g, now));
    if (hasPost && hasOpen) return n;
  }

  // 3) Latest finished jornada — if sealed, roll forward to next upcoming
  for (const n of [...nums].reverse()) {
    const games = coreOf(n);
    if (!games.some((g) => g.state === 'post')) continue;
    const hasOpen = games.some((g) => stillOnBoard(g, now));
    if (hasOpen) return n;
    const next = nums.find((m) => m > n && coreOf(m).some((g) => stillOnBoard(g, now)));
    if (next != null) return next;
    return n;
  }

  // 4) Earliest jornada with remaining games
  for (const n of nums) {
    if (coreOf(n).some((g) => stillOnBoard(g, now))) return n;
  }
  return nums[0] ?? null;
}

function overviewFrom(
  fixtures: Fixture[],
  source: JornadaOverview['source'],
  now: Date
): JornadaOverview | null {
  const n = pickActiveJornada(fixtures, now);
  if (n === null) return null;

  const label = `Jornada ${n}`;
  const games = fixturesOnJornadaFecha(fixtures, n)
    .map(attachDondeVer)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return {
    label,
    number: n,
    generatedAt: now.toISOString(),
    source,
    live: games.filter((g) => g.state === 'in'),
    played: games.filter((g) => g.state === 'post'),
    upcoming: games.filter((g) => g.state === 'pre' && !isFixtureHeld(g.statusLabel)),
    postponed: games.filter((g) => g.state === 'pre' && isFixturePostponed(g.statusLabel)),
  };
}

/** Instant jornada from the Apertura calendar — no Sportmonks. */
export function seedJornadaOverview(now = new Date()): JornadaOverview | null {
  return overviewFrom(seedLigaMxFixtures(), 'static', now);
}

export async function getJornadaOverview(now = new Date()): Promise<JornadaOverview | null> {
  const { fixtures, source } = await fetchLigaMxFixtures();
  return overviewFrom(fixtures, source, now);
}
