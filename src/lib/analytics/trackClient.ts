'use client';

import { track } from '@vercel/analytics';

type Props = Record<string, string | number | boolean | null>;

/** Client custom event. Never throws — analytics must not block the tap. */
export function trackClient(name: string, data?: Props) {
  try {
    if (data) track(name, data);
    else track(name);
  } catch {
    /* ignore */
  }
}
