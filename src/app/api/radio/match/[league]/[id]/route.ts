import { NextResponse } from 'next/server';
import { peekCache, peekCacheAgeMs } from '@/lib/apiCache';
import { isRadioStyle } from '@/lib/radio/personas';
import { buildRadioFeed } from '@/lib/radio/pipeline';
import { apiTtlMsForPace, type FreshPace } from '@/lib/sports/freshness';
import { getMatch, sportsMatchCacheKey } from '@/lib/sports/getMatch';
import type { MatchSnapshot } from '@/lib/sports';

function matchPace(m: MatchSnapshot): FreshPace {
  if (m.state === 'in') return 'live';
  if (m.state === 'pre') return 'near';
  return 'idle';
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  const styleParam = new URL(req.url).searchParams.get('style') ?? 'caliente';
  if (!isRadioStyle(styleParam)) {
    return NextResponse.json({ error: 'invalid_style' }, { status: 400 });
  }

  // Prefer the sports-match coalesce window so radio doesn't double SM detail calls.
  const cacheKey = sportsMatchCacheKey(league, id);
  const cached = peekCache<MatchSnapshot>(cacheKey);
  const age = peekCacheAgeMs(cacheKey);
  let match: MatchSnapshot | null = null;
  if (cached && age != null && age <= apiTtlMsForPace(matchPace(cached))) {
    match = cached;
  } else {
    match = await getMatch(league, id);
  }
  if (!match) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const feed = await buildRadioFeed(match, styleParam);
  return NextResponse.json(
    {
      matchId: match.id,
      style: styleParam,
      delaySec: feed.delaySec,
      enabled: feed.enabled,
      phase: feed.phase,
      mode: feed.mode,
      score: {
        home: match.home.score,
        away: match.away.score,
        state: match.state,
        label: match.statusLabel,
      },
      beats: feed.beats.map((b) => ({
        id: b.id,
        text: b.text,
        kind: b.kind,
        audioPath: b.audioPath,
        createdAt: b.createdAt,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
