'use client';

/**
 * Browser-side single-flight + short coalesce for identical GETs.
 * Multiple living-room widgets can subscribe to one upstream call.
 */

type Entry = {
  data: unknown;
  ts: number;
  inflight?: Promise<unknown>;
  subs: Set<(data: unknown) => void>;
};

const store = new Map<string, Entry>();

function entry(key: string): Entry {
  let e = store.get(key);
  if (!e) {
    e = { data: undefined, ts: 0, subs: new Set() };
    store.set(key, e);
  }
  return e;
}

export async function sharedJsonFetch<T>(
  key: string,
  url: string,
  coalesceMs: number
): Promise<T | null> {
  const e = entry(key);
  const age = Date.now() - e.ts;
  if (e.data !== undefined && age < coalesceMs) {
    return e.data as T;
  }
  if (e.inflight) return e.inflight as Promise<T | null>;

  e.inflight = (async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return (e.data as T) ?? null;
      const data = (await res.json()) as T;
      e.data = data;
      e.ts = Date.now();
      for (const sub of e.subs) sub(data);
      return data;
    } catch {
      return (e.data as T) ?? null;
    } finally {
      e.inflight = undefined;
    }
  })();

  return e.inflight as Promise<T | null>;
}

/** Subscribe to shared updates; returns unsubscribe. Does not auto-fetch. */
export function subscribeSharedJson<T>(key: string, onData: (data: T) => void): () => void {
  const e = entry(key);
  const wrapped = (data: unknown) => onData(data as T);
  e.subs.add(wrapped);
  if (e.data !== undefined) onData(e.data as T);
  return () => {
    e.subs.delete(wrapped);
  };
}
