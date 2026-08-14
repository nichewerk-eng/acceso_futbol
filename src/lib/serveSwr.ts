import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';

type SwrMeta = { stale: boolean; seeded: boolean };

export async function serveSwr<T>(opts: {
  key: string;
  ttlMs: number | ((data: T) => number);
  /** singleFlight memory coalesce. Default 2.5s so background refresh can actually run. */
  coalesceMs?: number;
  loader: () => Promise<T>;
  /** Instant first byte when memory is empty. Loader still runs in the background. */
  seed?: () => T | null | undefined;
  headers?: (data: T, meta: SwrMeta) => HeadersInit | undefined;
  /** Treat this payload as a miss (e.g. jornada `{ empty: true }`). */
  notFound?: (data: T) => boolean;
}): Promise<NextResponse> {
  const cached = peekCache<T>(opts.key);
  const age = peekCacheAgeMs(opts.key);
  const coalesce = opts.coalesceMs ?? 2_500;
  const refresh = () => {
    void singleFlight(opts.key, coalesce, opts.loader).catch(() => {});
  };
  const ttlOf = (data: T) =>
    typeof opts.ttlMs === 'function' ? opts.ttlMs(data) : opts.ttlMs;

  if (cached != null && !opts.notFound?.(cached)) {
    const stale = age == null || age > ttlOf(cached);
    if (stale) refresh();
    return NextResponse.json(cached, {
      headers: opts.headers?.(cached, { stale, seeded: false }),
    });
  }

  if (opts.seed) {
    const seed = opts.seed();
    if (seed != null && !opts.notFound?.(seed)) {
      refresh();
      return NextResponse.json(seed, {
        headers: {
          ...(opts.headers?.(seed, { stale: false, seeded: true }) ?? {}),
          'X-AF-Seed': '1',
        },
      });
    }
  }

  const data = await singleFlight(opts.key, coalesce, opts.loader);
  if (data == null || opts.notFound?.(data)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json(data, {
    headers: opts.headers?.(data, { stale: false, seeded: false }),
  });
}
