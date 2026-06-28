import { NextResponse } from 'next/server';
import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { getCache, setCache } from '@/lib/apiCache';

// Group stage (Jun 11) → Final (Jul 19) inclusive
const DATE_RANGE = '20260611-20260720';
const CACHE_KEY  = 'wc-fixtures';
const TTL_MS     = 30_000;

export async function GET() {
  const cached = getCache<ReturnType<typeof parseFixtures>>(CACHE_KEY, TTL_MS);
  if (cached) {
    return NextResponse.json({ fixtures: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  try {
    const raw = await espnFetch(scoreboardUrl(SLUG.WORLD_CUP, DATE_RANGE)) as { events?: EventRaw[] };
    const fixtures = parseFixtures(raw);
    setCache(CACHE_KEY, fixtures);
    return NextResponse.json({ fixtures }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    const stale = getCache<ReturnType<typeof parseFixtures>>(CACHE_KEY, Infinity);
    if (stale) return NextResponse.json({ fixtures: stale, stale: true }, { status: 200 });
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}

function parseFixtures(raw: { events?: EventRaw[] }) {
  return (raw.events ?? []).map((event) => {
    const comp        = event.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
    return {
      id:   event.id,
      date: event.date,
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
interface EventRaw { id: string; date: string; status?: { displayClock?: string; type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string } }; competitions?: CompetitionRaw[] }
