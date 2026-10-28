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
import { paintDondeVerList } from '@/lib/dondeVer/sheet';

const CACHE_KEY = 'jornada-overview-v18-dv-sheet';

function jornadaRows(o: JornadaOverview) {
  return [...o.live, ...o.played, ...o.upcoming, ...(o.postponed ?? [])];
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
    staleOk: (payload) =>
      'empty' in payload || paceFromFixtures(jornadaRows(payload)) !== 'live',
    loader: async () => (await getJornadaOverview()) ?? { empty: true as const },
    notFound: (d) => 'empty' in d,
    map: async (payload) => {
      if ('empty' in payload) return payload;
      const [live, played, upcoming, postponed] = await Promise.all([
        paintDondeVerList(payload.live),
        paintDondeVerList(payload.played),
        paintDondeVerList(payload.upcoming),
        paintDondeVerList(payload.postponed ?? []),
      ]);
      return { ...payload, live, played, upcoming, postponed };
    },
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
