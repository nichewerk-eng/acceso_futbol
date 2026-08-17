import { NextResponse } from 'next/server';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { listJornadaEpisodes, toEpisodeCut } from '@/lib/toma/episode';

export async function GET() {
  try {
    const jornada = await getJornadaOverview().catch(() => null);
    if (!jornada) {
      return NextResponse.json({ episode: null, episodes: [] });
    }
    const stored = await listJornadaEpisodes(jornada);
    const episodes = stored.map(toEpisodeCut);
    return NextResponse.json(
      { episode: episodes[episodes.length - 1] ?? null, episodes },
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
    return NextResponse.json({ episode: null, episodes: [] });
  }
}
