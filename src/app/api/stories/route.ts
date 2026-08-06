import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { getClubIdentity } from '@/config/clubIdentity';
import { aggregateStories } from '@/lib/news/aggregate';
import type { StoriesPayload } from '@/lib/news/types';

const CACHE_KEY = 'stories-v11-espn-web';
const TTL_MS = 120_000;

export async function GET(req: Request) {
  const clubSlug = new URL(req.url).searchParams.get('club');
  const club = clubSlug ? getClubIdentity(clubSlug) : null;
  const cacheKey = club ? `${CACHE_KEY}-club-${club.id}` : CACHE_KEY;

  const cached = getCache<StoriesPayload>(cacheKey, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  }

  try {
    const payload = await aggregateStories();
    const filtered: StoriesPayload = club
      ? {
          ...payload,
          stories: payload.stories.filter((s) =>
            club.matchHints.test(`${s.title} ${s.summary ?? ''}`)
          ),
        }
      : payload;
    setCache(cacheKey, filtered);
    return NextResponse.json(filtered, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'stories_unavailable' }, { status: 502 });
  }
}
