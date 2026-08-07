import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, setCache, singleFlight } from '@/lib/apiCache';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  type FreshPace,
} from '@/lib/sports/freshness';
import { getMatchTick, sportsMatchTickCacheKey } from '@/lib/sports/getMatch';
import { mergeMatchSnapshot } from '@/lib/sports/mergeMatchSnapshot';
import type { MatchSnapshot } from '@/lib/sports';

function matchPace(m: MatchSnapshot): FreshPace {
  if (m.state === 'in') return 'live';
  if (m.state === 'pre') return 'near';
  return 'idle';
}

/** Lean live scores/clock/events — preferred poll while the match is in-play. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  if (!['liga-mx', 'mundial', 'seleccion', 'leagues-cup'].includes(league)) {
    return NextResponse.json({ error: 'invalid_league' }, { status: 400 });
  }

  const CACHE_KEY = sportsMatchTickCacheKey(league, id);
  const cached = peekCache<MatchSnapshot>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const pace = matchPace(cached);
    if (age <= apiTtlMsForPace(pace)) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace, 'X-AF-Tick': '1' },
      });
    }
  }

  const tick = await singleFlight(CACHE_KEY, apiTtlMsForPace('live'), () =>
    getMatchTick(league, id)
  );
  if (!tick) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const merged = mergeMatchSnapshot(cached, tick);
  if (merged !== tick) setCache(CACHE_KEY, merged);

  const pace = matchPace(merged);
  return NextResponse.json(merged, {
    headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace, 'X-AF-Tick': '1' },
  });
}
