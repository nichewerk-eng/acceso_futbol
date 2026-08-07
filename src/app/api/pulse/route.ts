import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import { getPulse } from '@/lib/sports';
import type { PulsePayload } from '@/lib/sports';

const CACHE_KEY = 'pulse-v3-paced';

export async function GET() {
  const cached = peekCache<PulsePayload>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const rows = [...cached.live, ...cached.upcoming, ...cached.recent];
    const pace = paceFromFixtures(rows);
    if (age <= apiTtlMsForPace(pace)) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
      });
    }
  }

  const pulse = await singleFlight(CACHE_KEY, apiTtlMsForPace('live'), () => getPulse());
  const pace = paceFromFixtures([...pulse.live, ...pulse.upcoming, ...pulse.recent]);
  return NextResponse.json(pulse, {
    headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
  });
}
