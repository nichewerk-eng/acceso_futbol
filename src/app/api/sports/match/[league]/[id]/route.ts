import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { getMatch } from '@/lib/sports/getMatch';
import type { MatchSnapshot } from '@/lib/sports';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  if (!['liga-mx', 'mundial', 'seleccion'].includes(league)) {
    return NextResponse.json({ error: 'invalid_league' }, { status: 400 });
  }

  const CACHE_KEY = `sports-match-${league}-${id}`;
  const cached = getCache<MatchSnapshot>(CACHE_KEY, 12_000);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=12, stale-while-revalidate=20' },
    });
  }

  const match = await getMatch(league, id);
  if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  setCache(CACHE_KEY, match);
  return NextResponse.json(match, {
    headers: { 'Cache-Control': 'public, s-maxage=12, stale-while-revalidate=20' },
  });
}
