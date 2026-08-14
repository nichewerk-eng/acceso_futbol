import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { serveSwr } from '@/lib/serveSwr';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import { mergeLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';
import { localizeCity, localizeVenue } from '@/lib/sports/localizeEs';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { prefetchCurrentJornadaContexto } from '@/lib/sports/getMatch';
import { aperturaCalendar, refreshAperturaSmMap } from '@/lib/sports/aperturaSmMap';
import type { Fixture } from '@/lib/sports/types';

// Apertura 2026: July → December 2026
const DATE_RANGE = '20260701-20261231';
const CACHE_KEY = 'ligamx-fixtures-v13-sm-ids';

type FixturesPayload = { fixtures: LigaMXFixture[]; source: string };

export async function GET() {
  refreshAperturaSmMap();
  return serveSwr<FixturesPayload>({
    key: CACHE_KEY,
    ttlMs: (p) =>
      apiTtlMsForPace(
        paceFromFixtures(p.fixtures.map((f) => ({ state: f.status.state, date: f.date })))
      ),
    loader: async () => {
      let live: LigaMXFixture[] = [];
      try {
        const board = await fetchLigaMxFixtures();
        if (board.fixtures.length > 0) {
          live = board.fixtures.map(fixtureToSchedule);
        }
      } catch {
        /* fall through */
      }

      if (live.length === 0) {
        const raw = (await espnFetch(scoreboardUrl(SLUG.LIGA_MX, DATE_RANGE), {
          revalidate: false,
        })) as { events?: EventRaw[] };
        live = parseFixtures(raw);
      }

      const fixtures =
        live.length > 0 ? mergeLigaMxSchedule(live) : aperturaCalendar();
      prefetchCurrentJornadaContexto(fixtures);
      return { fixtures, source: live.length ? 'sportmonks' : 'static' };
    },
    seed: () => ({ fixtures: aperturaCalendar(), source: 'static' }),
    headers: (payload, { stale }) => {
      const pace = paceFromFixtures(
        payload.fixtures.map((f) => ({ state: f.status.state, date: f.date }))
      );
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}

export interface LigaMXFixture {
  id: string;
  date: string;
  league: 'liga-mx';
  jornada: string | null;
  status: {
    completed: boolean;
    state: string;
    description: string;
    shortDetail: string;
    displayClock: string;
  };
  venue: string | null;
  city: string | null;
  home: { name: string; abbreviation: string; score: string | null };
  away: { name: string; abbreviation: string; score: string | null };
}

function fixtureToSchedule(f: Fixture): LigaMXFixture {
  return {
    id: f.id,
    date: f.date,
    league: 'liga-mx',
    jornada: f.jornada ?? null,
    status: {
      completed: f.state === 'post',
      state: f.state,
      description: f.statusLabel,
      shortDetail: f.statusLabel,
      displayClock: f.clock ?? '',
    },
    venue: f.venue ?? null,
    city: f.city ?? null,
    home: {
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score ?? null,
    },
    away: {
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: f.away.score ?? null,
    },
  };
}

function parseFixtures(raw: { events?: EventRaw[] }): LigaMXFixture[] {
  return (raw.events ?? []).map((event) => {
    const comp = event.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
    return {
      id: event.id,
      date: event.date,
      league: 'liga-mx' as const,
      jornada: event.week?.number ? `Jornada ${event.week.number}` : null,
      status: {
        completed: event.status?.type?.completed ?? false,
        state: event.status?.type?.state ?? 'pre',
        description: event.status?.type?.description ?? '',
        shortDetail: event.status?.type?.shortDetail ?? '',
        displayClock: event.status?.displayClock ?? '',
      },
      venue: localizeVenue(comp?.venue?.fullName),
      city: localizeCity(comp?.venue?.address?.city),
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
}

interface CompetitorRaw {
  homeAway: 'home' | 'away';
  team: { displayName: string; abbreviation: string };
  score?: string;
}
interface CompetitionRaw {
  competitors: CompetitorRaw[];
  venue?: { fullName: string; address?: { city?: string } };
}
interface EventRaw {
  id: string;
  date: string;
  week?: { number: number };
  status?: {
    displayClock?: string;
    type?: {
      completed?: boolean;
      state?: string;
      description?: string;
      shortDetail?: string;
    };
  };
  competitions?: CompetitionRaw[];
}
