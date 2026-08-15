import { NextResponse } from 'next/server';
import { mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { getStoredEpisode } from '@/lib/toma/episode';

export async function GET() {
  try {
    const jornada = await getJornadaOverview().catch(() => null);
    if (!jornada) {
      return NextResponse.json({ episode: null });
    }
    const today = mexicoDayKey();
    const episode =
      (await getStoredEpisode(jornada.number, today)) ??
      (await getStoredEpisode(jornada.number, shiftDayKey(today, -1)));
    return NextResponse.json(
      { episode },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch {
    return NextResponse.json({ episode: null });
  }
}
