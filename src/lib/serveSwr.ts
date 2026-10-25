import { NextResponse, after } from 'next/server';
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
  /** Run on every returned payload (cache hit included). Channels, not scores. */
  map?: (data: T) => T | Promise<T>;
}): Promise<NextResponse> {
  const cached = peekCache<T>(opts.key);
  const age = peekCacheAgeMs(opts.key);
  const coalesce = opts.coalesceMs ?? 2_000;
  // Serverless freezes after the response; `after` keeps the stale refresh alive.
  const refresh = () => {
    const run = () => singleFlight(opts.key, coalesce, opts.loader).catch(() => {});
    try {
      after(run);
    } catch {
      void run();
    }
  };
  const ttlOf = (data: T) =>
    typeof opts.ttlMs === 'function' ? opts.ttlMs(data) : opts.ttlMs;
  const allowStale = (data: T) =>
    typeof opts.staleOk === 'function' ? opts.staleOk(data) : (opts.staleOk ?? true);
  const paint = async (data: T) => (opts.map ? await opts.map(data) : data);

  if (cached != null && !opts.notFound?.(cached)) {
    const stale = age == null || age > ttlOf(cached);
    if (stale && !allowStale(cached)) {
      const data = await singleFlight(opts.key, coalesce, opts.loader);
      if (data == null || opts.notFound?.(data)) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      const fresh = await paint(data);
      return NextResponse.json(fresh, {
        headers: opts.headers?.(fresh, { stale: false, seeded: false }),
      });
    }
    if (stale) refresh();
    const hit = await paint(cached);
    return NextResponse.json(hit, {
      headers: opts.headers?.(hit, { stale, seeded: false }),
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
        const fresh = await paint(data);
        return NextResponse.json(fresh, {
          headers: opts.headers?.(fresh, { stale: false, seeded: false }),
        });
      }
      if (stale) refresh();
      const hit = await paint(remote.data);
      return NextResponse.json(hit, {
        headers: opts.headers?.(hit, { stale, seeded: false }),
      });
    }
  }

  if (opts.seed) {
    const seed = opts.seed();
    if (seed != null && !opts.notFound?.(seed)) {
      refresh();
      const painted = await paint(seed);
      return NextResponse.json(painted, {
        headers: {
          ...(opts.headers?.(painted, { stale: false, seeded: true }) ?? {}),
          'X-AF-Seed': '1',
        },
      });
    }
  }

  const data = await singleFlight(opts.key, coalesce, opts.loader);
  if (data == null || opts.notFound?.(data)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const fresh = await paint(data);
  return NextResponse.json(fresh, {
    headers: opts.headers?.(fresh, { stale: false, seeded: false }),
  });
}
