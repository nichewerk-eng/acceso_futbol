'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { track } from '@vercel/analytics';
import { gaEventName } from '@/lib/analytics/ga';

type Props = Record<string, string | number | boolean | null>;

function toGaParams(data?: Props): Record<string, string | number> | undefined {
  if (!data) return undefined;
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    out[key] = typeof value === 'boolean' ? Number(value) : value;
  }
  return Object.keys(out).length ? out : undefined;
}

/** GA4 only — used when Vercel already recorded the same event server-side. */
export function trackGa(name: string, data?: Props) {
  try {
    const params = toGaParams(data);
    if (params) sendGAEvent('event', gaEventName(name), params);
    else sendGAEvent('event', gaEventName(name));
  } catch {
    /* ignore */
  }
}

/** Client custom event. Never throws — analytics must not block the tap. */
export function trackClient(name: string, data?: Props) {
  try {
    if (data) track(name, data);
    else track(name);
  } catch {
    /* ignore */
  }
  trackGa(name, data);
}
