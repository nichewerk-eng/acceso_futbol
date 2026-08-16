/** Sportmonks fetch lanes — every HTTP call must pick one. No implicit 12s no-store. */

export type SmLane = 'live' | 'board' | 'catalog';

export const LANE = {
  /** Scores that move. Never cache at the HTTP layer. */
  live: {
    timeoutMs: 3_000,
    retries: 0,
    revalidate: false as const,
    memTtlMs: 2_000,
  },
  /** Date slates / pre-match boards. */
  board: {
    timeoutMs: 4_000,
    retries: 0,
    revalidate: 120,
    memTtlMs: 3 * 60_000,
  },
  /** Form, H2H, standings, season, match detail. */
  catalog: {
    timeoutMs: 6_000,
    retries: 0,
    revalidate: 300,
    memTtlMs: 5 * 60_000,
  },
} as const satisfies Record<
  SmLane,
  { timeoutMs: number; retries: number; revalidate: number | false; memTtlMs: number }
>;
