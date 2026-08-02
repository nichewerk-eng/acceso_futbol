import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';

const CACHE_KEY = 'jornada-overview-v5-sm';
const TTL_MS = 30_000;

export async function GET() {
  const cached = getCache<JornadaOverview | { empty: true }>(CACHE_KEY, TTL_MS);
  if (cached) {
    if ('empty' in cached) {
      return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
    }
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  try {
    const overview = await getJornadaOverview();
    if (!overview) {
      setCache(CACHE_KEY, { empty: true });
      return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
    }
    setCache(CACHE_KEY, overview);
    return NextResponse.json(overview, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'jornada_unavailable' }, { status: 502 });
  }
}
