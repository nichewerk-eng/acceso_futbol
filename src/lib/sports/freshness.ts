/**
 * Freshness budget: competitive when it matters, quiet when it doesn't.
 * Live → short coalesce. Idle / no matchday pressure → longer TTL, fewer calls.
 */
export const FRESH = {
  /** Browser poll while something is in-play */
  clientPollLiveMs: 5_000,
  /** Browser poll when a kickoff is soon (or just finished) */
  clientPollNearMs: 12_000,
  /** Browser poll on quiet boards */
  clientPollIdleMs: 35_000,
  /** Default = live (call sites that don't adapt yet) */
  clientPollMs: 5_000,

  /** API coalesce while live */
  apiTtlLiveMs: 4_000,
  /** API coalesce near kickoff */
  apiTtlNearMs: 12_000,
  /** API coalesce when nothing can move */
  apiTtlIdleMs: 30_000,
  /** Back-compat alias (live) */
  apiTtlMs: 4_000,

  liveTtlMs: 4_000,
  sMaxAgeLive: 4,
  sMaxAgeNear: 12,
  sMaxAgeIdle: 30,
  swr: 8,

  standingsTtlMs: 45_000,
  standingsSMaxAge: 45,
  standingsClientMs: 45_000,

  storiesTtlMs: 60_000,

  espnCronicaTtlMs: 60_000,
  espnEnrichBudgetMs: 550,
  espnEnrichBudgetIdleMs: 2_000,

  /** Kickoff window that still warrants “near” polling */
  nearKickoffBeforeMs: 45 * 60_000,
  nearKickoffAfterMs: 3.5 * 60 * 60_000,
} as const;

export type FreshPace = 'live' | 'near' | 'idle';

export function paceFromFlags(hasLive: boolean, hasNear: boolean): FreshPace {
  if (hasLive) return 'live';
  if (hasNear) return 'near';
  return 'idle';
}

/** Whether a fixture kickoff is close enough that scores may start moving. */
export function isNearKickoff(
  dateIso: string,
  now = Date.now(),
  state?: string
): boolean {
  if (state === 'in') return true;
  if (state === 'post') return false;
  const kick = +new Date(dateIso);
  if (!Number.isFinite(kick)) return false;
  return (
    kick - now <= FRESH.nearKickoffBeforeMs && now - kick <= FRESH.nearKickoffAfterMs
  );
}

export function clientPollMsForPace(pace: FreshPace): number {
  if (pace === 'live') return FRESH.clientPollLiveMs;
  if (pace === 'near') return FRESH.clientPollNearMs;
  return FRESH.clientPollIdleMs;
}

export function apiTtlMsForPace(pace: FreshPace): number {
  if (pace === 'live') return FRESH.apiTtlLiveMs;
  if (pace === 'near') return FRESH.apiTtlNearMs;
  return FRESH.apiTtlIdleMs;
}

export function liveCacheHeaders(pace: FreshPace = 'live') {
  const sMaxAge =
    pace === 'live'
      ? FRESH.sMaxAgeLive
      : pace === 'near'
        ? FRESH.sMaxAgeNear
        : FRESH.sMaxAgeIdle;
  return {
    'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${FRESH.swr}`,
  };
}

export function standingsCacheHeaders() {
  return {
    'Cache-Control': `public, s-maxage=${FRESH.standingsSMaxAge}, stale-while-revalidate=${FRESH.standingsSMaxAge * 2}`,
  };
}

/** Pace from a list of fixtures / day games. */
export function paceFromFixtures(
  rows: { state?: string; date?: string }[],
  now = Date.now()
): FreshPace {
  let hasNear = false;
  for (const r of rows) {
    if (r.state === 'in') return 'live';
    if (r.date && isNearKickoff(r.date, now, r.state)) hasNear = true;
  }
  return hasNear ? 'near' : 'idle';
}
