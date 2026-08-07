import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';

const CACHE_KEY = 'jornada-overview-v8-paced';

function jornadaRows(o: JornadaOverview) {
  return [...o.live, ...o.played, ...o.upcoming];
}

export async function GET() {
  const cached = peekCache<JornadaOverview | { empty: true }>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    if ('empty' in cached) {
      if (age <= apiTtlMsForPace('idle')) {
        return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
      }
    } else {
      const pace = paceFromFixtures(jornadaRows(cached));
      if (age <= apiTtlMsForPace(pace)) {
        return NextResponse.json(cached, {
          headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
        });
      }
    }
  }

  const overview = await singleFlight(CACHE_KEY, apiTtlMsForPace('live'), async () => {
    const o = await getJornadaOverview();
    return o ?? { empty: true as const };
  });

  if ('empty' in overview) {
    return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
  }
  const pace = paceFromFixtures(jornadaRows(overview));
  return NextResponse.json(overview, {
    headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
  });
}
