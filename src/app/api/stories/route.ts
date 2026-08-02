import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { aggregateStories } from '@/lib/news/aggregate';
import type { StoriesPayload } from '@/lib/news/types';

const CACHE_KEY = 'stories-v7';
const TTL_MS = 120_000;

export async function GET() {
  const cached = getCache<StoriesPayload>(CACHE_KEY, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  }

  try {
    const payload = await aggregateStories();
    setCache(CACHE_KEY, payload);
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'stories_unavailable' }, { status: 502 });
  }
}
