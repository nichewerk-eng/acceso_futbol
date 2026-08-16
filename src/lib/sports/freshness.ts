/**
 * Freshness budget: competitive when it matters, quiet when it doesn't.
 * Live → short coalesce. Idle / no matchday pressure → longer TTL, fewer calls.
 */
export const FRESH = {
  /** Browser poll while something is in-play (tick/SSE path) */
  clientPollLiveMs: 1_000,
  /** Browser poll when a kickoff is soon (or just finished) */
  clientPollNearMs: 4_000,
  /** Browser poll on quiet boards */
  clientPollIdleMs: 35_000,
  /** Default = live (call sites that don't adapt yet) */
  clientPollMs: 1_000,

  /** API coalesce while live — 2s keeps Starter Fixture/hr under the soft cap */
  apiTtlLiveMs: 2_000,
  /** API coalesce near kickoff */
  apiTtlNearMs: 4_000,
  /** API coalesce when nothing can move */
  apiTtlIdleMs: 30_000,
  /** Back-compat alias (live) */
  apiTtlMs: 2_000,

  liveTtlMs: 2_000,
  sMaxAgeLive: 0,
  sMaxAgeNear: 4,
  sMaxAgeIdle: 30,
  swr: 2,
  /** Quiet day boards — CDN can hold these; scores don't move. */
  sMaxAgeIdleBoard: 60,
  swrIdleBoard: 300,

  standingsTtlMs: 45_000,
  standingsSMaxAge: 45,
  standingsClientMs: 45_000,

  storiesTtlMs: 60_000,

  espnCronicaTtlMs: 60_000,
  /** Live polls: don't stall the scoreboard waiting on ESPN. */
  espnEnrichBudgetMs: 550,
  /** First Completa paint (no cached ESPN yet) — wait longer once. */
  espnEnrichBudgetFirstMs: 2_500,
  espnEnrichBudgetIdleMs: 2_000,
  /** Re-hydrate full livescores if sticky board is this old without updates. */
  livescoresFullRefreshMs: 10_000,

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

/** Clock / label still say the match is on, even if state was marked FT. */
export function looksStillLive(f: {
  state?: string;
  clock?: string | null;
  statusLabel?: string | null;
}): boolean {
  if (f.state === 'in') return true;
  if (f.state !== 'post') return false;
  if (/^(HT|ET|PEN)\b/i.test(f.clock ?? '')) return true;
  if (/tiempo|descanso|\bht\b|half/i.test(f.statusLabel ?? '')) return true;
  const m = (f.clock ?? '').match(/^(\d+)/);
  return Boolean(m && Number(m[1]) < 90);
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
  if (pace === 'live') {
    return {
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    };
  }
  const sMaxAge = pace === 'near' ? FRESH.sMaxAgeNear : FRESH.sMaxAgeIdle;
  return {
    'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${FRESH.swr}`,
  };
}

/** Hero / jornada boards: tight while live, long SWR when idle. */
export function boardCacheHeaders(pace: FreshPace = 'idle') {
  if (pace === 'live') return liveCacheHeaders('live');
  if (pace === 'near') {
    return {
      'Cache-Control': `public, s-maxage=${FRESH.sMaxAgeNear}, stale-while-revalidate=30`,
    };
  }
  return {
    'Cache-Control': `public, s-maxage=${FRESH.sMaxAgeIdleBoard}, stale-while-revalidate=${FRESH.swrIdleBoard}`,
  };
}

export function standingsCacheHeaders() {
  return {
    'Cache-Control': `public, s-maxage=${FRESH.standingsSMaxAge}, stale-while-revalidate=${FRESH.standingsSMaxAge * 2}`,
  };
}

/** Pace from a list of fixtures / day games. */
export function paceFromFixtures(
  rows: { state?: string; date?: string; clock?: string | null; statusLabel?: string | null }[],
  now = Date.now()
): FreshPace {
  let hasNear = false;
  for (const r of rows) {
    if (looksStillLive(r)) return 'live';
    if (r.date && isNearKickoff(r.date, now, r.state)) hasNear = true;
  }
  return hasNear ? 'near' : 'idle';
}
