import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, setCache, singleFlight } from '@/lib/apiCache';
import { kvGetJson, sharedKvEnabled } from '@/lib/sharedKv';

type SwrMeta = { stale: boolean; seeded: boolean };

export async function serveSwr<T>(opts: {
  key: string;
  ttlMs: number | ((data: T) => number);
  /** singleFlight memory coalesce. Default 2s so background refresh can actually run. */
  coalesceMs?: number;
  loader: () => Promise<T>;
  /** Instant first byte when memory is empty. Loader still runs in the background. */
  seed?: () => T | null | undefined;
  headers?: (data: T, meta: SwrMeta) => HeadersInit | undefined;
  /** Treat this payload as a miss (e.g. jornada `{ empty: true }`). */
  notFound?: (data: T) => boolean;
  /**
   * When stale, return the last payload and refresh in the background.
   * Live scoreboards should pass false so a goal is not held for an extra poll.
   */
  staleOk?: boolean | ((data: T) => boolean);
}): Promise<NextResponse> {
  const cached = peekCache<T>(opts.key);
  const age = peekCacheAgeMs(opts.key);
  const coalesce = opts.coalesceMs ?? 2_000;
  const refresh = () => {
    void singleFlight(opts.key, coalesce, opts.loader).catch(() => {});
  };
  const ttlOf = (data: T) =>
    typeof opts.ttlMs === 'function' ? opts.ttlMs(data) : opts.ttlMs;
  const allowStale = (data: T) =>
    typeof opts.staleOk === 'function' ? opts.staleOk(data) : (opts.staleOk ?? true);

  if (cached != null && !opts.notFound?.(cached)) {
    const stale = age == null || age > ttlOf(cached);
    if (stale && !allowStale(cached)) {
      const data = await singleFlight(opts.key, coalesce, opts.loader);
      if (data == null || opts.notFound?.(data)) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json(data, {
        headers: opts.headers?.(data, { stale: false, seeded: false }),
      });
    }
    if (stale) refresh();
    return NextResponse.json(cached, {
      headers: opts.headers?.(cached, { stale, seeded: false }),
    });
  }

  // Cold isolate: a KV-shared payload beats a static seed. Without this, a fresh
  // isolate flashes its seed (e.g. games-of-day "Por jugar"/no score) while peers
  // that already warmed KV show the live board — the exact cross-surface drift.
  if (sharedKvEnabled()) {
    const remote = await kvGetJson<T>(opts.key);
    if (remote != null && !opts.notFound?.(remote.data)) {
      setCache(opts.key, remote.data);
      const stale = Date.now() - remote.ts > ttlOf(remote.data);
      if (stale && !allowStale(remote.data)) {
        const data = await singleFlight(opts.key, coalesce, opts.loader);
        if (data == null || opts.notFound?.(data)) {
          return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        return NextResponse.json(data, {
          headers: opts.headers?.(data, { stale: false, seeded: false }),
        });
      }
      if (stale) refresh();
      return NextResponse.json(remote.data, {
        headers: opts.headers?.(remote.data, { stale, seeded: false }),
      });
    }
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
