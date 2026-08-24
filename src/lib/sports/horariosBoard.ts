import { attachDondeVer } from '@/config/dondeVer';
import type { Fixture } from './types';
import { jornadaNumber } from './jornada';

export type HorarioRound = {
  number: number;
  label: string;
  fixtures: Fixture[];
};

export function groupHorarioRounds(fixtures: Fixture[]): HorarioRound[] {
  const byNum = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const n = jornadaNumber(f.jornada);
    if (n == null) continue;
    const list = byNum.get(n) ?? [];
    list.push(attachDondeVer(f));
    byNum.set(n, list);
  }
  return [...byNum.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({
      number: n,
      label: `Jornada ${n}`,
      fixtures: (byNum.get(n) ?? []).slice().sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    }));
}

/** Current matchday plus the next one — the slate Google/AI cite as "próximos". */
export function focusHorarioRounds(
  rounds: HorarioRound[],
  currentNumber: number | null
): HorarioRound[] {
  if (rounds.length === 0) return [];
  const current = currentNumber
    ? rounds.find((r) => r.number === currentNumber)
    : rounds.find((r) => r.fixtures.some((f) => f.state === 'in' || f.state === 'pre')) ??
      rounds[0];
  if (!current) return rounds.slice(0, 2);
  const next = rounds.find((r) => r.number > current.number);
  return next ? [current, next] : [current];
}
