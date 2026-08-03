import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  buildLeaguesCupBoard,
  fetchLeaguesCupSeasonFixtures,
  fetchLivescores,
  leaguesCupLeagueId,
  overlayLiveFixtures,
  sportmonksEnabled,
} from '@/lib/sports';
import {
  apiTtlMsForPace,
  isNearKickoff,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import type { Fixture } from '@/lib/sports/types';

const CACHE_KEY = 'leagues-cup-fixtures-v6-tv';

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
    const payload = await singleFlight(CACHE_KEY, apiTtlMsForPace('near'), async () => {
      const raw = sportmonksEnabled()
        ? await fetchLeaguesCupSeasonFixtures().catch(() => [] as Fixture[])
        : [];
      const board = buildLeaguesCupBoard(raw);
      const playable = board.filter((f) => !f.id.startsWith('lc-'));
      const now = Date.now();
      const mayBeLive =
        sportmonksEnabled() &&
        playable.some((f) => f.state === 'in' || isNearKickoff(f.date, now, f.state));
      const live = mayBeLive
        ? await fetchLivescores([leaguesCupLeagueId()]).catch(() => [] as Fixture[])
        : [];
      const merged = live.length ? buildLeaguesCupBoard(overlayLiveFixtures(raw, live)) : board;
      return { fixtures: merged, source: 'official+sportmonks' as const };
    });

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
