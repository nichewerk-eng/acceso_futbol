import { isMexicoDay, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { jornadaFechaCluster, jornadaNumber } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';
import { isFixtureHeld } from '@/lib/sports/localizeEs';

/**
 * Soft reset: ignore every jornada before this number. History through J5 was
 * wiped (duplicate anon/account rows); season memory starts at Jornada 6.
 */
export const QUINIELA_FROM = 6;

/** Same gate as the site jornada board: live, or pre with kickoff still ahead. */
function stillOnBoard(f: Fixture, now: Date): boolean {
  if (f.state === 'in') return true;
  if (f.state !== 'pre') return false;
  if (isFixtureHeld(f.statusLabel)) return false;
  return +new Date(f.date) >= +now - 2 * 3600_000;
}

function groupByJornada(fixtures: Fixture[]): Map<number, Fixture[]> {
  const byNum = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const n = jornadaNumber(f.jornada);
    if (n == null) continue;
    const list = byNum.get(n) ?? [];
    list.push(f);
    byNum.set(n, list);
  }
  return byNum;
}

function coreOf(byNum: Map<number, Fixture[]>, n: number): Fixture[] {
  return jornadaFechaCluster(byNum.get(n) ?? []);
}

/** Mexico calendar day of the jornada's last kickoff (YYYY-MM-DD). */
export function lastKickoffMexicoDay(games: Fixture[]): string | null {
  let last: string | null = null;
  for (const g of games) {
    const t = +new Date(g.date);
    if (!Number.isFinite(t)) continue;
    const d = mexicoDayKey(new Date(t));
    if (!last || d > last) last = d;
  }
  return last;
}

/**
 * Inclusive Mexico day the sealed ranking stays up: the full calendar day
 * after the last kickoff. Sunday finale → hold through Monday; rolls Tuesday.
 */
export function quinielaHoldThroughDay(games: Fixture[]): string | null {
  const last = lastKickoffMexicoDay(games);
  return last ? shiftDayKey(last, 1) : null;
}

export function quinielaHoldActive(games: Fixture[], now: Date): boolean {
  const through = quinielaHoldThroughDay(games);
  if (!through) return false;
  return mexicoDayKey(now) <= through;
}

/**
 * Quiniela matchday. Same live / in-progress rules as the site board, but a
 * sealed jornada keeps the ranking through the next Mexico day so the tabla
 * does not vanish the night the last game ends.
 */
export function pickQuinielaJornada(fixtures: Fixture[], now = new Date()): number | null {
  const byNum = groupByJornada(fixtures);
  if (byNum.size === 0) return null;

  const nums = [...byNum.keys()].filter((n) => n >= QUINIELA_FROM).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const dayKey = mexicoDayKey(now);

  for (const n of nums) {
    if (coreOf(byNum, n).some((g) => g.state === 'in')) return n;
  }

  for (const n of nums) {
    if (coreOf(byNum, n).some((g) => isMexicoDay(g.date, dayKey))) return n;
  }

  for (const n of nums) {
    const games = coreOf(byNum, n);
    const hasPost = games.some((g) => g.state === 'post');
    const hasOpen = games.some((g) => stillOnBoard(g, now));
    if (hasPost && hasOpen) return n;
  }

  for (const n of [...nums].reverse()) {
    const games = coreOf(byNum, n);
    if (!games.some((g) => g.state === 'post')) continue;
    if (games.some((g) => stillOnBoard(g, now))) return n;
    if (quinielaHoldActive(games, now)) return n;
    const next = nums.find((m) => m > n && coreOf(byNum, m).some((g) => stillOnBoard(g, now)));
    if (next != null) return next;
    return n;
  }

  for (const n of nums) {
    if (coreOf(byNum, n).some((g) => stillOnBoard(g, now))) return n;
  }
  return nums[0] ?? null;
}
