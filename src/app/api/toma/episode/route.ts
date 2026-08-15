import { NextResponse } from 'next/server';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { pickPlayableEpisode } from '@/lib/toma/episode';

export async function GET() {
  try {
    const jornada = await getJornadaOverview().catch(() => null);
    if (!jornada) {
      return NextResponse.json({ episode: null });
    }
    const episode = await pickPlayableEpisode(jornada);
    return NextResponse.json(
      { episode },
      {
        headers: {
          'Cache-Control':
            process.env.NODE_ENV === 'development'
              ? 'no-store'
              : 'public, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch {
    return NextResponse.json({ episode: null });
  }
}
