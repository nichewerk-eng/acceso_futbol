// In-memory TTL cache + single-flight for API route handlers.
// Warmed serverless instances reuse module state across users on the same instance.

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
      const data = await loader();
      setCache(key, data);
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, pending);
  return pending;
}
