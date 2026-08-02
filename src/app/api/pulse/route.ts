import { NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { getPulse } from '@/lib/sports';
import type { PulsePayload } from '@/lib/sports';

const CACHE_KEY = 'pulse-v1';
const TTL_MS = 15_000;

export async function GET() {
  const cached = getCache<PulsePayload>(CACHE_KEY, TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    });
  }

  try {
    const pulse = await getPulse();
    setCache(CACHE_KEY, pulse);
    return NextResponse.json(pulse, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'pulse_unavailable' }, { status: 502 });
  }
}
