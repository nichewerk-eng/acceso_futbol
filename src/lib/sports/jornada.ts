import { attachDondeVer } from '@/config/dondeVer';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture } from './types';
import { fetchLigaMxFixtures, seedLigaMxFixtures } from './espnFallback';

export type JornadaOverview = {
  label: string;
  number: number;
  generatedAt: string;
  source: 'sportmonks' | 'espn' | 'static';
  live: Fixture[];
  played: Fixture[];
  upcoming: Fixture[];
};

export function jornadaNumber(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Live, or pre with kickoff still ahead (ignore abandoned/stale board rows). */
function stillOnBoard(f: Fixture, now: Date): boolean {
  if (f.state === 'in') return true;
  if (f.state !== 'pre') return false;
  return +new Date(f.date) >= +now - 2 * 3600_000;
}

function pickActiveJornada(fixtures: Fixture[], now = new Date()): number | null {
  const dayKey = mexicoDayKey(now);
  const withNum = fixtures
    .map((f) => ({ f, n: jornadaNumber(f.jornada) }))
    .filter((x): x is { f: Fixture; n: number } => x.n !== null);

  if (withNum.length === 0) return null;

  const byNum = new Map<number, Fixture[]>();
  for (const { f, n } of withNum) {
    const list = byNum.get(n) ?? [];
    list.push(f);
    byNum.set(n, list);
  }

  const nums = [...byNum.keys()].sort((a, b) => a - b);

  // 1) Jornada with a game today or live
  for (const n of nums) {
    const games = byNum.get(n)!;
    if (games.some((g) => g.state === 'in' || isMexicoDay(g.date, dayKey))) return n;
  }

  // 2) Jornada in progress (finished + remaining real fixtures)
  for (const n of nums) {
    const games = byNum.get(n)!;
    const hasPost = games.some((g) => g.state === 'post');
    const hasOpen = games.some((g) => stillOnBoard(g, now));
    if (hasPost && hasOpen) return n;
  }

  // 3) Latest finished jornada — if sealed, roll forward to next upcoming
  for (const n of [...nums].reverse()) {
    const games = byNum.get(n)!;
    if (!games.some((g) => g.state === 'post')) continue;
    const hasOpen = games.some((g) => stillOnBoard(g, now));
    if (hasOpen) return n;
    const next = nums.find((m) => m > n && byNum.get(m)!.some((g) => stillOnBoard(g, now)));
    if (next != null) return next;
    return n;
  }

  // 4) Earliest jornada with remaining games
  for (const n of nums) {
    if (byNum.get(n)!.some((g) => stillOnBoard(g, now))) return n;
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
  const games = fixtures
    .filter((f) => jornadaNumber(f.jornada) === n)
    .map(attachDondeVer)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  return {
    label,
    number: n,
    generatedAt: now.toISOString(),
    source,
    live: games.filter((g) => g.state === 'in'),
    played: games.filter((g) => g.state === 'post'),
    upcoming: games.filter((g) => g.state === 'pre'),
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
