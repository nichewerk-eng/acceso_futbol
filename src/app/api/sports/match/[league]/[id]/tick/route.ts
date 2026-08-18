import { NextResponse } from 'next/server';
import { serveSwr } from '@/lib/serveSwr';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  type FreshPace,
} from '@/lib/sports/freshness';
import { getMatchTick, sportsMatchTickCacheKey } from '@/lib/sports/getMatch';
import { mergeMatchSnapshot } from '@/lib/sports/mergeMatchSnapshot';
import { peekCache, setCache } from '@/lib/apiCache';
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
  if (!['liga-mx', 'liga-mx-femenil', 'mundial', 'seleccion', 'leagues-cup'].includes(league)) {
    return NextResponse.json({ error: 'invalid_league' }, { status: 400 });
  }

  const CACHE_KEY = sportsMatchTickCacheKey(league, id);
  return serveSwr<MatchSnapshot | null>({
    key: CACHE_KEY,
    ttlMs: (m) => (m ? apiTtlMsForPace(matchPace(m)) : apiTtlMsForPace('idle')),
    staleOk: (m) => !m || matchPace(m) !== 'live',
    loader: async () => {
      const tick = await getMatchTick(league, id);
      if (!tick) return null;
      const prev = peekCache<MatchSnapshot>(CACHE_KEY);
      const merged = mergeMatchSnapshot(prev, tick);
      if (merged !== tick) setCache(CACHE_KEY, merged);
      return merged;
    },
    notFound: (m) => m == null,
    headers: (m, { stale }) => {
      if (!m) return undefined;
      const pace = matchPace(m);
      return {
        ...liveCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Tick': '1',
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
