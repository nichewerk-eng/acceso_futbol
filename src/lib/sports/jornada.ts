import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture } from './types';
import { fetchEspnLigaMxFixtures } from './espnFallback';

export type JornadaOverview = {
  label: string;
  number: number;
  generatedAt: string;
  source: 'espn' | 'static';
  live: Fixture[];
  played: Fixture[];
  upcoming: Fixture[];
};

function jornadaNumber(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
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

  // 2) Jornada in progress (has both finished and remaining)
  for (const n of nums) {
    const games = byNum.get(n)!;
    const hasPost = games.some((g) => g.state === 'post');
    const hasOpen = games.some((g) => g.state === 'pre' || g.state === 'in');
    if (hasPost && hasOpen) return n;
  }

  // 3) Latest jornada with any finished game
  for (const n of [...nums].reverse()) {
    if (byNum.get(n)!.some((g) => g.state === 'post')) return n;
  }

  // 4) Earliest upcoming jornada
  return nums[0] ?? null;
}

export async function getJornadaOverview(now = new Date()): Promise<JornadaOverview | null> {
  const { fixtures, source } = await fetchEspnLigaMxFixtures();
  const n = pickActiveJornada(fixtures, now);
  if (n === null) return null;

  const label = `Jornada ${n}`;
  const games = fixtures
    .filter((f) => jornadaNumber(f.jornada) === n)
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
