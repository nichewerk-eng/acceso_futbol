import { mexicoDayKey } from '@/lib/radio/phases';
import { kickHold } from './localizeEs';

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
