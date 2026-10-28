import { mexicoDayKey } from '@/lib/radio/phases';
import { kickHold } from './localizeEs';
import type { MatchState } from './types';

/** Kickoff this old with a score is finished, even if Sportmonks still says NS. */
const FINISHED_AFTER_MS = 3 * 3600_000;

/**
 * Sportmonks / ESPN overlay wins on a real move (new Mexico day, postpone,
 * cancel, live, FT). Stale NS on the original day must not clobber an
 * editorial hold — SM often lags Liga MX Leagues Cup reprogramming.
 * A postpone on an *earlier* Mexico day must not pull a later scheduled
 * kickoff back onto the old weekend.
 */
export function overlayShouldReplaceSeedSchedule(
  seed: { date: string; statusLabel: string },
  overlay: { date: string; state: string; statusLabel: string }
): boolean {
  if (overlay.state === 'in' || overlay.state === 'post') return true;
  const overlayHold = kickHold(overlay.statusLabel);
  if (overlayHold === 'postponed' || overlayHold === 'cancelled') {
    try {
      if (mexicoDayKey(new Date(overlay.date)) < mexicoDayKey(new Date(seed.date))) {
        return false;
      }
    } catch {
      /* keep going */
    }
    return true;
  }
  const seedHold = kickHold(seed.statusLabel);
  if (seedHold !== 'postponed' && seedHold !== 'cancelled') return true;
  try {
    return mexicoDayKey(new Date(overlay.date)) !== mexicoDayKey(new Date(seed.date));
  } catch {
    return true;
  }
}

/**
 * Season includes sometimes keep Saturday results as NS after the date-board
 * window has closed. A past kickoff with a score is FT, not "Por jugar".
 */
export function inferFinishedIfKickoffPassed(opts: {
  state: MatchState;
  dateIso: string;
  homeScore: string | null;
  awayScore: string | null;
  statusLabel?: string | null;
  now?: number;
}): MatchState {
  if (opts.state !== 'pre') return opts.state;
  if (kickHold(opts.statusLabel) === 'postponed' || kickHold(opts.statusLabel) === 'cancelled') {
    return opts.state;
  }
  if (opts.homeScore == null || opts.awayScore == null) return opts.state;
  const t = +new Date(opts.dateIso);
  if (!Number.isFinite(t)) return opts.state;
  if (t > (opts.now ?? Date.now()) - FINISHED_AFTER_MS) return opts.state;
  return 'post';
}
