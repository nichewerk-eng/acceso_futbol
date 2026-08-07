import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import { buildLeaguesCupBoard, fetchLeaguesCupLiveBoard } from '@/lib/sports';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import type { Fixture } from '@/lib/sports/types';

const CACHE_KEY = 'leagues-cup-fixtures-v8-live-board';

export async function GET() {
  const cached = peekCache<{ fixtures: Fixture[]; source: string }>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const pace = paceFromFixtures(cached.fixtures.filter((f) => !f.id.startsWith('lc-')));
    if (age <= apiTtlMsForPace(pace)) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
      });
    }
  }

  try {
    const payload = await singleFlight(CACHE_KEY, apiTtlMsForPace('live'), () =>
      fetchLeaguesCupLiveBoard()
    );

    const pace = paceFromFixtures(payload.fixtures.filter((f) => !f.id.startsWith('lc-')));
    return NextResponse.json(payload, {
      headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
    });
  } catch {
    const stale = peekCache<{ fixtures: Fixture[]; source: string }>(CACHE_KEY);
    if (stale) {
      return NextResponse.json(
        { ...stale, stale: true },
        { headers: liveCacheHeaders('idle') }
      );
    }
    return NextResponse.json(
      { fixtures: buildLeaguesCupBoard([]), source: 'official' },
      { headers: liveCacheHeaders('idle') }
    );
  }
}
