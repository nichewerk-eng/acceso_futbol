import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  type FreshPace,
} from '@/lib/sports/freshness';
import { getMatch, sportsMatchCacheKey } from '@/lib/sports/getMatch';
import type { MatchSnapshot } from '@/lib/sports';

function matchPace(m: MatchSnapshot): FreshPace {
  if (m.state === 'in') return 'live';
  if (m.state === 'pre') return 'near';
  return 'idle';
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  if (!['liga-mx', 'mundial', 'seleccion', 'leagues-cup'].includes(league)) {
    return NextResponse.json({ error: 'invalid_league' }, { status: 400 });
  }

  const CACHE_KEY = sportsMatchCacheKey(league, id);
  const cached = peekCache<MatchSnapshot>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const pace = matchPace(cached);
    const hasStory =
      (cached.comments?.length ?? 0) > 0 || (cached.events?.length ?? 0) > 0;
    if (age <= apiTtlMsForPace(pace) && (pace === 'live' || hasStory || pace === 'near')) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
      });
    }
  }

  const match = await singleFlight(CACHE_KEY, apiTtlMsForPace('live'), () =>
    getMatch(league, id)
  );
  if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const pace = matchPace(match);
  return NextResponse.json(match, {
    headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
  });
}
