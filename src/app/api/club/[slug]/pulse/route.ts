import { NextResponse } from 'next/server';
import { getCache, singleFlight } from '@/lib/apiCache';
import { getClubIdentity } from '@/config/clubIdentity';
import { getClubPulse, type ClubPulsePayload } from '@/lib/news/clubPulse';

const TTL_MS = 180_000;

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!getClubIdentity(slug)) {
    return NextResponse.json({ error: 'club_not_found' }, { status: 404 });
  }

  const key = `club-pulse-v3-${slug}`;
  const cached = getCache<ClubPulsePayload>(key, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' },
    });
  }

  try {
    const pulse = await singleFlight(key, TTL_MS, async () => {
      const p = await getClubPulse(slug);
      if (!p) throw new Error('club_not_found');
      return p;
    });
    return NextResponse.json(pulse, {
      headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'pulse_unavailable' }, { status: 502 });
  }
}
