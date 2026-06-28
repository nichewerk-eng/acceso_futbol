import { NextResponse } from 'next/server';
import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { getCache, setCache } from '@/lib/apiCache';
import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';

// Apertura 2026: July → December 2026
const DATE_RANGE = '20260701-20261231';
const CACHE_KEY  = 'ligamx-fixtures';
const TTL_MS     = 30_000;

export async function GET() {
  const cached = getCache<ReturnType<typeof parseFixtures>>(CACHE_KEY, TTL_MS);
  if (cached) return NextResponse.json({ fixtures: cached }, { headers: ccHeaders });

  try {
    const raw = await espnFetch(scoreboardUrl(SLUG.LIGA_MX, DATE_RANGE)) as { events?: EventRaw[] };
    const espnFixtures = parseFixtures(raw);

    // If ESPN returns no data yet (season hasn't started), serve static schedule
    const fixtures = espnFixtures.length > 0 ? espnFixtures : APERTURA_2026_FIXTURES;
    setCache(CACHE_KEY, fixtures);
    return NextResponse.json({ fixtures }, { headers: ccHeaders });
  } catch {
    const stale = getCache<ReturnType<typeof parseFixtures>>(CACHE_KEY, Infinity);
    if (stale) return NextResponse.json({ fixtures: stale, stale: true });
    // Always fall back to static schedule rather than returning an error
    return NextResponse.json({ fixtures: APERTURA_2026_FIXTURES }, { headers: ccHeaders });
  }
}

const ccHeaders = { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' };

export interface LigaMXFixture {
  id: string; date: string; league: 'liga-mx';
  jornada: string | null;
  status: { completed: boolean; state: string; description: string; shortDetail: string; displayClock: string };
  venue: string | null; city: string | null;
  home: { name: string; abbreviation: string; score: string | null };
  away: { name: string; abbreviation: string; score: string | null };
}

function parseFixtures(raw: { events?: EventRaw[] }): LigaMXFixture[] {
  return (raw.events ?? []).map((event) => {
    const comp        = event.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
    return {
      id:   event.id,
      date: event.date,
      league: 'liga-mx',
      jornada: event.week?.number ? `Jornada ${event.week.number}` : null,
      status: {
        completed:   event.status?.type?.completed   ?? false,
        state:       event.status?.type?.state       ?? 'pre',
        description: event.status?.type?.description ?? '',
        shortDetail: event.status?.type?.shortDetail ?? '',
        displayClock: event.status?.displayClock ?? '',
      },
      venue: comp?.venue?.fullName ?? null,
      city:  comp?.venue?.address?.city ?? null,
      home: { name: home?.team?.displayName ?? '', abbreviation: home?.team?.abbreviation ?? '', score: home?.score ?? null },
      away: { name: away?.team?.displayName ?? '', abbreviation: away?.team?.abbreviation ?? '', score: away?.score ?? null },
    };
  });
}

interface CompetitorRaw { homeAway: 'home' | 'away'; team: { displayName: string; abbreviation: string }; score?: string }
interface CompetitionRaw { competitors: CompetitorRaw[]; venue?: { fullName: string; address?: { city?: string } } }
interface EventRaw { id: string; date: string; week?: { number: number }; status?: { displayClock?: string; type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string } }; competitions?: CompetitionRaw[] }
