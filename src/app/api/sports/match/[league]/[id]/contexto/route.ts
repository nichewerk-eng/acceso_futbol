import { NextResponse } from 'next/server';
import { serveSwr } from '@/lib/serveSwr';
import {
  getMatchContexto,
  sportsMatchContextoCacheKey,
  type MatchContexto,
} from '@/lib/sports/getMatch';

const TTL_MS = 30 * 60_000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  if (!['liga-mx', 'mundial', 'seleccion', 'leagues-cup'].includes(league)) {
    return NextResponse.json({ error: 'invalid_league' }, { status: 400 });
  }

  return serveSwr<MatchContexto | null>({
    key: sportsMatchContextoCacheKey(league, id),
    ttlMs: TTL_MS,
    coalesceMs: TTL_MS,
    loader: () => getMatchContexto(league, id),
    notFound: (d) => d == null,
    headers: (_d, { stale }) => ({
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      'X-AF-Stale': stale ? '1' : '0',
    }),
  });
}
