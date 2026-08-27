import type { QuinielaLeaderboard } from './types';

/**
 * Keep the last good jornada tabla when a poll comes back without one
 * (KV timeout) or with an empty same-jornada snapshot (failed HGETALL
 * used to look like "nobody played").
 */
export function adoptLeaderboard(
  prev: QuinielaLeaderboard | null,
  next: QuinielaLeaderboard | null | undefined
): QuinielaLeaderboard | null {
  if (next == null) return prev;
  if (
    prev &&
    prev.rows.length > 0 &&
    next.rows.length === 0 &&
    prev.jornadaKey === next.jornadaKey
  ) {
    return prev;
  }
  return next;
}
