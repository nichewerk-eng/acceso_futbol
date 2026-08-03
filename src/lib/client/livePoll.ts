'use client';

import { FRESH, type FreshPace, clientPollMsForPace } from '@/lib/sports/freshness';

export type LivePollOptions = {
  /** Fixed interval; ignored when `getPace` is set */
  intervalMs?: number;
  /** Adaptive pace from latest data (preferred) */
  getPace?: () => FreshPace;
};

/**
 * Adaptive poll: fast when live, slow when idle.
 * Pauses entirely while the tab is hidden (saves calls; bumps on return).
 */
export function startLivePoll(
  load: () => void,
  intervalOrOpts: number | LivePollOptions = FRESH.clientPollMs
): () => void {
  const opts: LivePollOptions =
    typeof intervalOrOpts === 'number' ? { intervalMs: intervalOrOpts } : intervalOrOpts;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const intervalNow = () => {
    if (opts.getPace) return clientPollMsForPace(opts.getPace());
    return opts.intervalMs ?? FRESH.clientPollMs;
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = () => {
    clear();
    if (stopped) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    timer = setTimeout(() => {
      if (stopped) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      load();
      schedule();
    }, intervalNow());
  };

  const onVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      load();
      schedule();
    } else {
      clear();
    }
  };

  // Immediate first load only when visible.
  if (typeof document === 'undefined' || document.visibilityState === 'visible') {
    load();
    schedule();
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onVisibility);

  return () => {
    stopped = true;
    clear();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onVisibility);
  };
}
