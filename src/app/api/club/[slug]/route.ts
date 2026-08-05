import { NextResponse } from 'next/server';
import { getCache, singleFlight } from '@/lib/apiCache';
import { getClubIdentity } from '@/config/clubIdentity';
import { getClubBoard, type ClubBoard } from '@/lib/sports/clubBoard';

const TTL_MS = 60_000;

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!getClubIdentity(slug)) {
    return NextResponse.json({ error: 'club_not_found' }, { status: 404 });
  }

  const key = `club-board-v1-${slug}`;
  const cached = getCache<ClubBoard>(key, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }

  try {
    const board = await singleFlight(key, TTL_MS, async () => {
      const b = await getClubBoard(slug);
      if (!b) throw new Error('club_not_found');
      return b;
    });
    return NextResponse.json(board, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ error: 'club_unavailable' }, { status: 502 });
  }
}
