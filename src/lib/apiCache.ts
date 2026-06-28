// Simple in-memory TTL cache for API route handlers.
// Warmed serverless instances reuse module state, so this meaningfully
// reduces upstream ESPN calls when multiple users hit the same instance.

interface Entry<T> { data: T; ts: number }
const store = new Map<string, Entry<unknown>>();

export function getCache<T>(key: string, ttlMs: number): T | null {
  const e = store.get(key) as Entry<T> | undefined;
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) { store.delete(key); return null; }
  return e.data;
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() });
}
