import { NextResponse } from 'next/server';
import { attachDondeVer } from '@/config/dondeVer';
import { peekCache, peekCacheAgeMs, singleFlight } from '@/lib/apiCache';
import {
  fetchLeaguesCupSeasonFixtures,
  fetchLivescores,
  involvesLigaMxClub,
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

const CACHE_KEY = 'leagues-cup-fixtures-v4-paced';

export async function GET() {
  const cached = peekCache<{ fixtures: Fixture[]; source: string }>(CACHE_KEY);
  const age = peekCacheAgeMs(CACHE_KEY);
  if (cached && age != null) {
    const pace = paceFromFixtures(cached.fixtures);
    if (age <= apiTtlMsForPace(pace)) {
      return NextResponse.json(cached, {
        headers: { ...liveCacheHeaders(pace), 'X-AF-Pace': pace },
      });
    }
  }

  if (!sportmonksEnabled()) {
    return NextResponse.json(
      { fixtures: [], source: 'unavailable', error: 'sportmonks_disabled' },
      { status: 503, headers: liveCacheHeaders('idle') }
    );
  }

  try {
    const payload = await singleFlight(CACHE_KEY, apiTtlMsForPace('near'), async () => {
      const raw = await fetchLeaguesCupSeasonFixtures();
      const mx = raw.filter((f) => involvesLigaMxClub(f.home, f.away));
      const now = Date.now();
      const mayBeLive = mx.some(
        (f) => f.state === 'in' || isNearKickoff(f.date, now, f.state)
      );
      const live = mayBeLive
        ? await fetchLivescores([leaguesCupLeagueId()]).catch(() => [] as Fixture[])
        : [];
      const board = overlayLiveFixtures(mx, live);
      const fixtures = board
        .map(attachDondeVer)
        .sort((a, b) => +new Date(a.date) - +new Date(b.date));
      return { fixtures, source: 'sportmonks' as const };
    });

    const pace = paceFromFixtures(payload.fixtures);
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
      { fixtures: [], source: 'error' },
      { status: 502, headers: liveCacheHeaders('idle') }
    );
  }
}
