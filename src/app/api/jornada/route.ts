import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs } from '@/lib/apiCache';
import { serveSwr } from '@/lib/serveSwr';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import {
  getJornadaOverview,
  type JornadaOverview,
} from '@/lib/sports/jornada';

const CACHE_KEY = 'jornada-overview-v13-live-states';

function jornadaRows(o: JornadaOverview) {
  return [...o.live, ...o.played, ...o.upcoming];
}

type Cached = JornadaOverview | { empty: true };

export async function GET() {
  const cached = peekCache<Cached>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && 'empty' in cached) {
    if (age != null && age <= apiTtlMsForPace('idle')) {
      return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
    }
  }

  return serveSwr<Cached>({
    key: CACHE_KEY,
    ttlMs: (payload) =>
      'empty' in payload
        ? apiTtlMsForPace('idle')
        : apiTtlMsForPace(paceFromFixtures(jornadaRows(payload))),
    loader: async () => (await getJornadaOverview()) ?? { empty: true as const },
    notFound: (d) => 'empty' in d,
    headers: (payload, { stale }) => {
      if ('empty' in payload) return undefined;
      const pace = paceFromFixtures(jornadaRows(payload));
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
