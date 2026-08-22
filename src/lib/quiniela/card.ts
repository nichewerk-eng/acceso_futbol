import type { Outcome, QuinielaMatch } from './types';

export function isOutcome(v: unknown): v is Outcome {
  return v === '1' || v === 'X' || v === '2';
}

/** Open (not kicked off) matches still missing a pick. */
export function missingOpenPicks(
  matches: Pick<QuinielaMatch, 'id' | 'locked'>[],
  picks: Record<string, unknown>
): string[] {
  return matches.filter((m) => !m.locked && !isOutcome(picks[m.id])).map((m) => m.id);
}
