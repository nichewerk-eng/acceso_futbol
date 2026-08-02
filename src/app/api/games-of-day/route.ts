import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { getGamesOfDay, type GamesOfDayPayload } from '@/lib/sports/gamesOfDay';

const CACHE_KEY = 'games-of-day-v1';
const TTL_MS = 20_000;

export async function GET() {
  const cached = getCache<GamesOfDayPayload>(CACHE_KEY, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' },
    });
  }

  try {
    const payload = await getGamesOfDay();
    setCache(CACHE_KEY, payload);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=40' },
    });
  } catch {
    return NextResponse.json({ error: 'games_unavailable' }, { status: 502 });
  }
}
