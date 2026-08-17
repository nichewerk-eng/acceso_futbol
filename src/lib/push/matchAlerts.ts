import { FRESH } from '@/lib/sports/freshness';
import type { MatchState } from '@/lib/sports/types';

export type AlertSnap = { state: MatchState; hs: number; as: number };

export function numScore(v: string | number | undefined | null): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Seed / cold-isolate payloads often flash 0-0 "Por jugar" over a match we
 * already know. Treat that as a hole, not a restart — otherwise the next real
 * board looks like a brand-new 3-0 GOL hours after FT.
 */
export function stabilizeAlertSnap(prev: AlertSnap | undefined, cur: AlertSnap): AlertSnap {
  if (!prev) return cur;
  const hole = cur.hs === 0 && cur.as === 0 && (prev.hs > 0 || prev.as > 0);
  if (!hole) return cur;
  return {
    state: cur.state === 'pre' ? prev.state : cur.state,
    hs: prev.hs,
    as: prev.as,
  };
}

/**
 * Kickoff + goal avisos from a previous snapshot.
 * A finished score appearing (pre/post → post 3-0) is catch-up, not a live GOL.
 */
export function matchAlerts(
  prev: AlertSnap | undefined,
  cur: AlertSnap,
  kickoffIso: string,
  now = Date.now()
): Array<'kickoff' | 'goal'> {
  if (!prev) return [];
  const out: Array<'kickoff' | 'goal'> = [];
  const kick = +new Date(kickoffIso);
  const age = Number.isFinite(kick) ? now - kick : 0;

  if (prev.state !== 'in' && cur.state === 'in') {
    if (age >= -FRESH.nearKickoffBeforeMs && age <= FRESH.nearKickoffBeforeMs) {
      out.push('kickoff');
    }
  }

  const scored = cur.hs > prev.hs || cur.as > prev.as;
  if (!scored) return out;
  // Already live (or the FT tick) — never "we just learned the result".
  if (prev.state === 'in' && (cur.state === 'in' || cur.state === 'post')) {
    if (age <= FRESH.nearKickoffAfterMs) out.push('goal');
  }
  return out;
}
