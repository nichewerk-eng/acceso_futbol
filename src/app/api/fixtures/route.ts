import { NextResponse } from 'next/server';

// Group stage + Round of 32 runs Jun 11 → Jul 4 2026
const FIXTURES_URL =
  'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260704&limit=200';

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(FIXTURES_URL, {
      next: { revalidate: 60 },
      headers: { 'User-Agent': 'AccesoFutbol/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    }

    const raw = await res.json();

    const fixtures = (raw.events ?? []).map((event: EventRaw) => {
      const comp = event.competitions?.[0];
      const competitors = comp?.competitors ?? [];
      const home =
        competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
      const away =
        competitors.find((c) => c.homeAway === 'away') ?? competitors[1];

      return {
        id: event.id,
        date: event.date,
        status: {
          completed: event.status?.type?.completed ?? false,
          state: event.status?.type?.state ?? 'pre',
          description: event.status?.type?.description ?? '',
          shortDetail: event.status?.type?.shortDetail ?? '',
        },
        venue: comp?.venue?.fullName ?? null,
        city: comp?.venue?.address?.city ?? null,
        home: {
          name: home?.team?.displayName ?? '',
          abbreviation: home?.team?.abbreviation ?? '',
          score: home?.score ?? null,
        },
        away: {
          name: away?.team?.displayName ?? '',
          abbreviation: away?.team?.abbreviation ?? '',
          score: away?.score ?? null,
        },
      };
    });

    return NextResponse.json(
      { fixtures },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

// ── Internal raw types ────────────────────────────────────────────────────────

interface CompetitorRaw {
  homeAway: 'home' | 'away';
  team: { displayName: string; abbreviation: string };
  score?: string;
}

interface CompetitionRaw {
  competitors: CompetitorRaw[];
  venue?: {
    fullName: string;
    address?: { city?: string };
  };
}

interface EventRaw {
  id: string;
  date: string;
  status?: {
    type?: {
      completed?: boolean;
      state?: string;
      description?: string;
      shortDetail?: string;
    };
  };
  competitions?: CompetitionRaw[];
}
