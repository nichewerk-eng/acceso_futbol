import { NextResponse } from 'next/server';
import { isRadioStyle } from '@/lib/radio/personas';
import { buildRadioFeed } from '@/lib/radio/pipeline';
import { getMatch } from '@/lib/sports/getMatch';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  const styleParam = new URL(req.url).searchParams.get('style') ?? 'caliente';
  if (!isRadioStyle(styleParam)) {
    return NextResponse.json({ error: 'invalid_style' }, { status: 400 });
  }

  const match = await getMatch(league, id);
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
