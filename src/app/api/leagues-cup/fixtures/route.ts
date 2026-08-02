import { NextResponse } from 'next/server';
import { attachDondeVer } from '@/config/dondeVer';
import { getCache, setCache } from '@/lib/apiCache';
import {
  fetchLeaguesCupSeasonFixtures,
  involvesLigaMxClub,
  sportmonksEnabled,
} from '@/lib/sports';
import type { Fixture } from '@/lib/sports/types';

const CACHE_KEY = 'leagues-cup-fixtures-v1';
const TTL_MS = 45_000;
const ccHeaders = { 'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=90' };

export async function GET() {
  const cached = getCache<{ fixtures: Fixture[]; source: string }>(CACHE_KEY, TTL_MS);
  if (cached) return NextResponse.json(cached, { headers: ccHeaders });

  if (!sportmonksEnabled()) {
    return NextResponse.json(
      { fixtures: [], source: 'unavailable', error: 'sportmonks_disabled' },
      { status: 503, headers: ccHeaders }
    );
  }

  try {
    const raw = await fetchLeaguesCupSeasonFixtures();
    const fixtures = raw
      .filter((f) => involvesLigaMxClub(f.home, f.away))
      .map(attachDondeVer)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const payload = { fixtures, source: 'sportmonks' as const };
    setCache(CACHE_KEY, payload);
    return NextResponse.json(payload, { headers: ccHeaders });
  } catch {
    const stale = getCache<{ fixtures: Fixture[]; source: string }>(CACHE_KEY, Infinity);
    if (stale) return NextResponse.json({ ...stale, stale: true }, { headers: ccHeaders });
    return NextResponse.json(
      { fixtures: [], source: 'error' },
      { status: 502, headers: ccHeaders }
    );
  }
}
