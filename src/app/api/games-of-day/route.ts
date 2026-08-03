import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import { getGamesOfDay, type GamesOfDayPayload } from '@/lib/sports/gamesOfDay';

const CACHE_KEY = 'games-of-day-v6-next-day';

export async function GET() {
  const cached = peekCache<GamesOfDayPayload>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const pace = paceFromFixtures(cached.games);
    if (age <= apiTtlMsForPace(pace)) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
      });
    }
  }

  // Coalesce concurrent misses; TTL set inside singleFlight uses near as floor.
  const payload = await singleFlight(CACHE_KEY, apiTtlMsForPace('near'), () =>
    getGamesOfDay()
  );
  const pace = paceFromFixtures(payload.games);
  return NextResponse.json(payload, {
    headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
  });
}
