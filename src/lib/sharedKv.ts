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
