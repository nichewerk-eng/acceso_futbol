import { track } from '@vercel/analytics/server';

type Props = Record<string, string | number | boolean | null>;

/** Server custom event. Never fails the request. */
export async function trackServer(name: string, data?: Props) {
  try {
    if (data) await track(name, data);
    else await track(name);
  } catch {
    /* ignore */
  }
}
