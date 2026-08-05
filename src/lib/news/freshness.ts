import { mexicoDayKey } from '@/lib/radio/phases';

/** MX calendar yesterday (relative to `now`). */
export function mexicoYesterdayKey(now = new Date()): string {
  return mexicoDayKey(new Date(+now - 24 * 60 * 60_000));
}

/**
 * Keep cable / pulse items from today or yesterday (Mexico City day).
 * Missing dates are treated as stale — never pin undated wire.
 */
export function isFreshNewsDay(
  publishedAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!publishedAt) return false;
  try {
    const day = mexicoDayKey(new Date(publishedAt));
    return day === mexicoDayKey(now) || day === mexicoYesterdayKey(now);
  } catch {
    return false;
  }
}

export function filterFreshByPublishedAt<T extends { publishedAt?: string | null }>(
  items: T[],
  now = new Date()
): T[] {
  return items.filter((item) => isFreshNewsDay(item.publishedAt, now));
}
