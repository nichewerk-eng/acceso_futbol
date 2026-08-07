// In-memory TTL cache + single-flight for API route handlers.
// Optional Upstash Redis L2 (sharedKv) so Vercel isolates share live boards.

import { kvGetJson, kvSetJson, sharedKvEnabled } from '@/lib/sharedKv';

interface Entry<T> {
  data: T;
  ts: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCache<T>(key: string, ttlMs: number): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) {
    store.delete(key);
    return null;
  }
  return e.data;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}

export function peekCacheAgeMs(key: string): number | null {
  const e = store.get(key);
  if (!e) return null;
  return Date.now() - e.ts;
}

/** Read without TTL expiry (for pace-aware decisions). */
export function peekCache<T>(key: string): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  return e ? e.data : null;
}

/**
 * One upstream load per key while a request is in flight.
 * Concurrent callers share the same Promise (and the cached result).
 * When Upstash is configured, also read/write shared KV (L2).
 */
export async function singleFlight<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCache<T>(key, ttlMs);
  if (cached !== null) return cached;

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const pending = (async () => {
    try {
      if (sharedKvEnabled()) {
        const remote = await kvGetJson<T>(key);
        if (remote && Date.now() - remote.ts <= ttlMs) {
          setCache(key, remote.data);
          return remote.data;
        }
      }

      const data = await loader();
      setCache(key, data);
      if (sharedKvEnabled()) {
        // Keep KV a bit longer than local coalesce so cold isolates hit L2.
        void kvSetJson(key, data, Math.max(ttlMs * 3, 12_000));
      }
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, pending);
  return pending;
}
