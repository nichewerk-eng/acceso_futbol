import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/apiCache';
import { aggregateStories } from '@/lib/news/aggregate';
import {
  buildCableBriefFeed,
  CABLE_BRIEF_TTL_MS,
  cableBriefId,
  type CableBriefPayload,
} from '@/lib/radio/cableBrief';
import { isRadioStyle, type RadioStyle } from '@/lib/radio/personas';
import { getJornadaOverview } from '@/lib/sports/jornada';

export async function GET(req: NextRequest) {
  const styleParam = req.nextUrl.searchParams.get('style') ?? 'caliente';
  if (!isRadioStyle(styleParam)) {
    return NextResponse.json({ error: 'invalid_style' }, { status: 400 });
  }
  const style = styleParam as RadioStyle;
  const cacheKey = `cable-brief-payload-${cableBriefId(style)}`;

  const cached = getCache<CableBriefPayload>(cacheKey, CABLE_BRIEF_TTL_MS);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  }

  try {
    const [storiesPayload, jornada] = await Promise.all([
      aggregateStories(),
      getJornadaOverview().catch(() => null),
    ]);

    const payload = await buildCableBriefFeed(storiesPayload.stories, jornada, style);
    setCache(cacheKey, payload);

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'brief_unavailable' }, { status: 502 });
  }
}
