import { NextResponse } from 'next/server';
import { isMexicoDay, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { getStoredEpisode } from '@/lib/toma/episode';

export async function GET() {
  try {
    const jornada = await getJornadaOverview().catch(() => null);
    if (!jornada) {
      return NextResponse.json({ episode: null });
    }
    const today = mexicoDayKey();
    const all = [...jornada.live, ...jornada.played, ...jornada.upcoming];
    const todayFx = all.filter((f) => isMexicoDay(f.date, today));
    const todayOpen = todayFx.some((f) => f.state === 'pre' || f.state === 'in');
    const episode =
      (await getStoredEpisode(jornada.number, today)) ??
      (todayOpen
        ? null
        : await getStoredEpisode(jornada.number, shiftDayKey(today, -1)));
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
