/**
 * Optional shared cache across Vercel isolates (Upstash Redis REST).
 * When env is missing, all helpers no-op and callers keep using process memory.
 *
 * Env:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

type KvGetResult = { result: string | null };

function kvConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

export function sharedKvEnabled(): boolean {
  return kvConfigured();
}

async function kvCommand<T>(body: unknown[]): Promise<T | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function kvGetJson<T>(key: string): Promise<{ data: T; ts: number } | null> {
  if (!kvConfigured()) return null;
  const raw = await kvCommand<KvGetResult>(['GET', `af:${key}`]);
  const text = raw?.result;
  if (!text) return null;
  try {
    return JSON.parse(text) as { data: T; ts: number };
  } catch {
    return null;
  }
}

/** SET with PX expiry (ms). Stores `{ data, ts }`. */
export async function kvSetJson<T>(key: string, data: T, ttlMs: number): Promise<void> {
  if (!kvConfigured()) return;
  const payload = JSON.stringify({ data, ts: Date.now() });
  const px = Math.max(1_000, Math.ceil(ttlMs));
  await kvCommand(['SET', `af:${key}`, payload, 'PX', String(px)]);
}

/** SET NX PX. Returns false if the key already exists or KV is off. */
export async function kvSetNx(key: string, value: string, ttlMs: number): Promise<boolean> {
  if (!kvConfigured()) return false;
  const px = Math.max(1_000, Math.ceil(ttlMs));
  const raw = await kvCommand<{ result: string | null }>([
    'SET',
    `af:${key}`,
    value,
    'PX',
    String(px),
    'NX',
  ]);
  return raw?.result === 'OK';
}

/**
 * Durable hash helpers (no TTL) for small registries — e.g. push subscriptions.
 * All no-op / return empty when KV is off so callers can fall back to memory.
 */
export async function kvHset(key: string, field: string, value: string): Promise<void> {
  if (!kvConfigured()) return;
  await kvCommand(['HSET', `af:${key}`, field, value]);
}

export async function kvHdel(key: string, field: string): Promise<void> {
  if (!kvConfigured()) return;
  await kvCommand(['HDEL', `af:${key}`, field]);
}

/** Single hash field, or null when missing / KV off. */
export async function kvHget(key: string, field: string): Promise<string | null> {
  if (!kvConfigured()) return null;
  const raw = await kvCommand<{ result: string | null }>(['HGET', `af:${key}`, field]);
  return raw?.result ?? null;
}

/** Delete a key (no-op when KV off). */
export async function kvDel(key: string): Promise<void> {
  if (!kvConfigured()) return;
  await kvCommand(['DEL', `af:${key}`]);
}

/**
 * HGETALL flattened into a `{ field: value }` record.
 * Empty hash → `{}`. Command/network failure → `null` (do not treat as empty).
 */
export async function kvHgetall(key: string): Promise<Record<string, string> | null> {
  if (!kvConfigured()) return {};
  const raw = await kvCommand<{ result: unknown }>(['HGETALL', `af:${key}`]);
  if (raw == null) return null;
  const res = raw.result;
  const out: Record<string, string> = {};
  if (Array.isArray(res)) {
    for (let i = 0; i + 1 < res.length; i += 2) out[String(res[i])] = String(res[i + 1]);
  } else if (res && typeof res === 'object') {
    for (const [k, v] of Object.entries(res as Record<string, unknown>)) out[k] = String(v);
  }
  return out;
}
