import { after, NextResponse } from 'next/server';
import { getJornadaTakePayload } from '@/lib/sports/jornadaTakeAi';
import { maybeGenerateTomaEpisode } from '@/lib/toma/generateEpisode';

export async function GET() {
  try {
    const take = await getJornadaTakePayload();
    if (!take) {
      return NextResponse.json({ error: 'no_jornada' }, { status: 404 });
    }
    after(() => {
      void maybeGenerateTomaEpisode();
    });
    const live = take.phase === 'live';
    return NextResponse.json(
      { take, generatedAt: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': live
            ? 'public, s-maxage=60, stale-while-revalidate=120'
            : 'public, s-maxage=300, stale-while-revalidate=900',
        },
      }
    );
  } catch {
    return NextResponse.json({ error: 'toma_unavailable' }, { status: 502 });
  }
}
