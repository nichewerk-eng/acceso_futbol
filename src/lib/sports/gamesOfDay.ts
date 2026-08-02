import { attachDondeVer } from '@/config/dondeVer';
import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import {
  isMexicoDay,
  mexicoDayKey,
  radioPhase,
  type RadioPhase,
} from '@/lib/radio/phases';
import type { Fixture, MatchState } from './types';
import { fetchEspnLigaMxFixtures } from './espnFallback';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { fetchFixturesByDate, fetchLivescores, sportmonksEnabled } from './sportmonks';
import { fetchSeleccionGamesOfDay } from './seleccion';

export type DayGame = Fixture & {
  phase: RadioPhase;
  radioAvailable: boolean;
  radioLabel: string;
};

export type GamesOfDayPayload = {
  dayKey: string;
  generatedAt: string;
  source: 'sportmonks' | 'espn' | 'mixed' | 'static';
  games: DayGame[];
};

function radioMeta(
  phase: RadioPhase,
  state: Fixture['state']
): Pick<DayGame, 'radioAvailable' | 'radioLabel'> {
  if (phase === 'live') return { radioAvailable: true, radioLabel: 'AF Radio en vivo' };
  if (phase === 'preshow') return { radioAvailable: true, radioLabel: 'Pre-show Acceso' };
  if (phase === 'recap' && state === 'post') {
    return { radioAvailable: true, radioLabel: 'Recap podcast' };
  }
  return { radioAvailable: false, radioLabel: 'Cabina al inicio' };
}

function enrich(fixtures: Fixture[], now = Date.now()): DayGame[] {
  return fixtures.map((f) => {
    const phase = radioPhase(f, now);
    return { ...f, phase, ...radioMeta(phase, f.state) };
  });
}

function sortDayGames(games: DayGame[]): DayGame[] {
  const rank = (g: DayGame) => {
    if (g.phase === 'live' || g.state === 'in') return 0;
    if (g.phase === 'preshow') return 1;
    if (g.state === 'pre') return 2;
    return 3;
  };
  return [...games].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return +new Date(a.date) - +new Date(b.date);
  });
}

type BoardEvent = {
  id: string;
  date: string;
  week?: { number: number };
  status?: {
    displayClock?: string;
    type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string };
  };
  competitions?: {
    competitors: {
      homeAway: 'home' | 'away';
      team: { id?: string; displayName: string; abbreviation: string; logos?: { href: string }[] };
      score?: string;
    }[];
    venue?: { fullName: string; address?: { city?: string } };
  }[];
};

function mapBoardEvent(event: BoardEvent): Fixture {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const stateRaw = event.status?.type?.state;
  const state: MatchState =
    event.status?.type?.completed || stateRaw === 'post'
      ? 'post'
      : stateRaw === 'in'
        ? 'in'
        : 'pre';

  return attachDondeVer({
    id: event.id,
    provider: 'espn',
    league: 'liga-mx',
    date: event.date,
    jornada: event.week?.number ? `Jornada ${event.week.number}` : null,
    state,
    statusLabel: localizeStatus(
      event.status?.type?.shortDetail || event.status?.type?.description || null,
      state
    ),
    clock: event.status?.displayClock,
    venue: localizeVenue(comp?.venue?.fullName),
    city: localizeCity(comp?.venue?.address?.city),
    home: {
      id: home?.team?.id ?? home?.team?.abbreviation ?? 'home',
      name: home?.team?.displayName ?? 'Local',
      abbreviation: home?.team?.abbreviation ?? 'LOC',
      logo: home?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : (home?.score ?? null),
    },
    away: {
      id: away?.team?.id ?? away?.team?.abbreviation ?? 'away',
      name: away?.team?.displayName ?? 'Visitante',
      abbreviation: away?.team?.abbreviation ?? 'VIS',
      logo: away?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : (away?.score ?? null),
    },
  });
}

async function fetchEspnDayBoard(dayKey: string): Promise<Fixture[]> {
  const ymd = dayKey.replace(/-/g, '');
  try {
    const raw = (await espnFetch(scoreboardUrl(SLUG.LIGA_MX, ymd, 50))) as {
      events?: BoardEvent[];
    };
    return (raw.events ?? []).map(mapBoardEvent);
  } catch {
    return [];
  }
}

async function ligaMxForDay(
  dayKey: string
): Promise<{ fixtures: Fixture[]; source: GamesOfDayPayload['source'] }> {
  if (sportmonksEnabled()) {
    try {
      const next = new Date(`${dayKey}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const nextKey = next.toISOString().slice(0, 10);
      const [live, a, b] = await Promise.all([
        fetchLivescores(),
        fetchFixturesByDate(dayKey),
        fetchFixturesByDate(nextKey),
      ]);
      const byId = new Map<string, Fixture>();
      for (const f of [...live, ...a, ...b]) {
        if (isMexicoDay(f.date, dayKey) || f.state === 'in') {
          byId.set(f.id, attachDondeVer(f));
        }
      }
      return { fixtures: [...byId.values()], source: 'sportmonks' };
    } catch {
      /* Sportmonks down → ESPN below */
    }
  }

  const next = new Date(`${dayKey}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextKey = next.toISOString().slice(0, 10);
  const [boardA, boardB] = await Promise.all([
    fetchEspnDayBoard(dayKey),
    fetchEspnDayBoard(nextKey),
  ]);
  const board = [...boardA, ...boardB].filter(
    (f) => isMexicoDay(f.date, dayKey) || f.state === 'in'
  );
  if (board.length > 0) {
    const byId = new Map(board.map((f) => [f.id, f]));
    return { fixtures: [...byId.values()], source: 'espn' };
  }

  const { fixtures, source } = await fetchEspnLigaMxFixtures();
  return {
    fixtures: fixtures
      .filter((f) => isMexicoDay(f.date, dayKey) || f.state === 'in')
      .map(attachDondeVer),
    source,
  };
}

export async function getGamesOfDay(now = new Date()): Promise<GamesOfDayPayload> {
  const dayKey = mexicoDayKey(now);
  const [liga, seleccion] = await Promise.all([
    ligaMxForDay(dayKey),
    fetchSeleccionGamesOfDay(dayKey),
  ]);

  const byId = new Map<string, Fixture>();
  for (const f of liga.fixtures) byId.set(`liga-${f.id}`, f);
  for (const f of seleccion) byId.set(`sel-${f.id}`, f);

  const games = sortDayGames(enrich([...byId.values()], now.getTime()));
  const source: GamesOfDayPayload['source'] =
    seleccion.length > 0 && liga.source !== 'static' ? 'mixed' : liga.source;

  return {
    dayKey,
    generatedAt: now.toISOString(),
    source,
    games,
  };
}
