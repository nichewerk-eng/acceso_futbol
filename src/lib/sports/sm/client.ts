import {
  beforeSmRequest,
  entityForPath,
  getSmRateSnapshot,
  noteSmRateLimit,
  type SmRateLimitInfo,
} from '@/lib/sports/smRateLimit';
import { LANE, type SmLane } from './lanes';

const BASE = 'https://api.sportmonks.com/v3/football';

type SmJson<T> = T & { rate_limit?: SmRateLimitInfo; retry_after?: number };

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function isAbort(err: unknown): boolean {
  return (
    (err instanceof Error && err.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      err instanceof DOMException &&
      err.name === 'AbortError')
  );
}

export function sportmonksToken(): string | null {
  return process.env.SPORTMONKS_API_TOKEN?.trim() || null;
}

/**
 * Sportmonks GET. Lane picks timeout, retries-on-timeout, and Next fetch cache.
 * Abort never retries. 429 retries once only when retry_after ≤ 2s.
 */
export async function smFetch<T>(
  path: string,
  params: Record<string, string> = {},
  lane: SmLane
): Promise<T> {
  const token = sportmonksToken();
  if (!token) throw new Error('SPORTMONKS_API_TOKEN missing');

  const spec = LANE[lane];
  const entity = entityForPath(path);
  await beforeSmRequest(entity);

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const maxAttempts = 2; // one 429 retry slot; timeouts never loop

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), spec.timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        ...(spec.revalidate === false
          ? { cache: 'no-store' as const }
          : { next: { revalidate: spec.revalidate } }),
      });

      if (res.status === 429) {
        let body: SmJson<Record<string, never>> | null = null;
        try {
          body = (await res.json()) as SmJson<Record<string, never>>;
        } catch {
          body = null;
        }
        if (body?.rate_limit) noteSmRateLimit(body.rate_limit);
        const retrySec =
          Number(body?.retry_after) ||
          Number(body?.rate_limit?.resets_in_seconds) ||
          Number(res.headers.get('Retry-After')) ||
          0;
        if (attempt < maxAttempts - 1 && retrySec > 0 && retrySec <= 2) {
          await sleep(retrySec * 1000 + Math.floor(Math.random() * 200));
          continue;
        }
        throw new Error(`Sportmonks HTTP 429 (${entity})`);
      }

      if (!res.ok) throw new Error(`Sportmonks HTTP ${res.status}`);
      const json = (await res.json()) as SmJson<T>;
      if (json.rate_limit) noteSmRateLimit(json.rate_limit);
      if (process.env.AF_SM_DEBUG === '1') {
        const snap = getSmRateSnapshot()[entity];
        console.info(
          `[sportmonks] ${lane} ${path} ok · ${entity} remaining=${snap?.remaining ?? '?'}`
        );
      }
      return json;
    } catch (err) {
      if (isAbort(err)) throw err;
      if (attempt < maxAttempts - 1 && err instanceof Error && /429/.test(err.message)) {
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Sportmonks request failed');
}
