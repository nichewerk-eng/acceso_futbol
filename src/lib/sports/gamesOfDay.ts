import { attachDondeVer } from '@/config/dondeVer';
import { aperturaCalendar, refreshAperturaSmMap } from './aperturaSmMap';
import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import {
  isMexicoDay,
  mexicoDayKey,
  radioPhase,
  shiftDayKey,
  type RadioPhase,
} from '@/lib/radio/phases';
import type { Fixture, MatchState } from './types';
import { fetchEspnLigaMxFixtures, fetchLigaMxFixtures } from './espnFallback';
import { isFixtureHeld, localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { involvesLigaMxClub } from './ligaMxTeams';
import {
  fetchFixturesByDate,
  livingRoomLeagueIds,
  sportmonksEnabled,
} from './sportmonks';
import { fetchSeleccionGamesOfDay } from './seleccion';
import { buildLeaguesCupBoard, fetchLeaguesCupLiveBoard } from './leaguesCupBoard';

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
  /** True when today is empty and games are the next slate. */
  upcoming?: boolean;
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

function keepLivingRoomFixture(f: Fixture): boolean {
  if (f.league === 'leagues-cup') return involvesLigaMxClub(f.home, f.away);
  return true;
}

function onLivingRoomDay(f: Fixture, dayKey: string): boolean {
  if (isFixtureHeld(f.statusLabel)) return false;
  return isMexicoDay(f.date, dayKey) || f.state === 'in';
}

function livingRoomLc(fixtures: Fixture[]): Fixture[] {
  return fixtures.filter(keepLivingRoomFixture).map(attachDondeVer);
}

async function officialLcBoard(): Promise<Fixture[]> {
  try {
    const { fixtures } = await fetchLeaguesCupLiveBoard();
    return livingRoomLc(fixtures);
  } catch {
    return livingRoomLc(buildLeaguesCupBoard([]));
  }
}

/** UTC date keys that cover Mexico calendar `dayKey` plus the next Mexico day (evening kickoffs roll UTC). */
function utcBoardKeys(mexicoDay: string) {
  return [mexicoDay, shiftDayKey(mexicoDay, 1), shiftDayKey(mexicoDay, 2)];
}

async function ligaMxDateWindow(
  dayKey: string
): Promise<{ today: Fixture[]; dated: Fixture[]; source: GamesOfDayPayload['source'] }> {
  const boardKeys = utcBoardKeys(dayKey);
  const lcP = officialLcBoard();

  if (sportmonksEnabled()) {
    try {
      // Liga MX rows come from the one canonical board (same as jornada/pulse),
      // so hero and "en vivo + sellados" agree on every state — not just live.
      const board = await fetchLigaMxFixtures();
      const liga = board.fixtures.map(attachDondeVer);
      // Official LC board (KO included — Sportmonks has no 2026 knockout ids yet).
      const dated = [...liga, ...(await lcP)];
      const today = dated.filter((f) => onLivingRoomDay(f, dayKey));
      return { today, dated, source: board.source };
    } catch {
      /* Sportmonks down → ESPN below */
    }
  }

  const espnBoards = await Promise.all(boardKeys.map((k) => fetchEspnDayBoard(k)));
  const dated = [...espnBoards.flat(), ...(await lcP)];
  const today = dated.filter((f) => onLivingRoomDay(f, dayKey));
  if (espnBoards.flat().length > 0) {
    return { today, dated, source: 'espn' };
  }

  const { fixtures, source } = await fetchEspnLigaMxFixtures();
  const mapped = fixtures.map(attachDondeVer);
  const withLc = [...mapped, ...(await lcP)];
  return {
    today: withLc.filter((f) => onLivingRoomDay(f, dayKey)),
    dated: withLc,
    source,
  };
}

function firstUpcomingDay(
  pool: Fixture[],
  nowMs: number
): { fixtures: Fixture[]; dayKey: string } | null {
  const future = pool
    .filter((f) => f.state === 'pre' && !isFixtureHeld(f.statusLabel) && +new Date(f.date) > nowMs)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (!future.length) return null;
  const dayKey = mexicoDayKey(new Date(future[0].date));
  return {
    fixtures: future.filter((f) => isMexicoDay(f.date, dayKey)),
    dayKey,
  };
}

function upcomingFromStatic(now: Date): { fixtures: Fixture[]; dayKey?: string } {
  const t = now.getTime();
  const liga = aperturaCalendar()
    .filter(
      (f) =>
        f.status.state === 'pre' &&
        !isFixtureHeld(f.status.shortDetail || f.status.description) &&
        +new Date(f.date) > t
    )
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .map(staticRowToFixture);
  const lc = livingRoomLc(buildLeaguesCupBoard([]));
  return firstUpcomingDay([...liga, ...lc], t) ?? { fixtures: [] };
}

function staticRowToFixture(f: ReturnType<typeof aperturaCalendar>[number]): Fixture {
  const state: MatchState =
    f.status.state === 'in' || f.status.state === 'post' ? f.status.state : 'pre';
  return attachDondeVer({
    id: f.id,
    provider: 'espn',
    league: 'liga-mx',
    date: f.date,
    jornada: f.jornada,
    state,
    statusLabel: f.status.shortDetail || f.status.description || '',
    clock: f.status.displayClock || undefined,
    venue: f.venue,
    city: f.city,
    home: {
      id: f.home.abbreviation,
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score,
    },
    away: {
      id: f.away.abbreviation,
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: f.away.score,
    },
  });
}

/** Instant hero slate from the Apertura calendar + official LC board — no Sportmonks. */
export function seedGamesOfDay(now = new Date()): GamesOfDayPayload {
  const dayKey = mexicoDayKey(now);
  const lc = livingRoomLc(buildLeaguesCupBoard([]));
  const todayStatic = [
    ...aperturaCalendar()
      .filter(
        (f) =>
          isMexicoDay(f.date, dayKey) &&
          !isFixtureHeld(f.status.shortDetail || f.status.description)
      )
      .map(staticRowToFixture),
    ...lc.filter((f) => isMexicoDay(f.date, dayKey) || f.state === 'in'),
  ];

  if (todayStatic.length > 0) {
    return {
      dayKey,
      generatedAt: now.toISOString(),
      source: 'static',
      games: sortDayGames(enrich(todayStatic, now.getTime())),
    };
  }

  const planned = upcomingFromStatic(now);
  const slateDay = planned.dayKey ?? dayKey;
  return {
    dayKey: slateDay,
    generatedAt: now.toISOString(),
    source: 'static',
    games: sortDayGames(enrich(planned.fixtures, now.getTime())),
    upcoming: planned.fixtures.length > 0 && slateDay !== dayKey ? true : undefined,
  };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function getGamesOfDay(now = new Date()): Promise<GamesOfDayPayload> {
  refreshAperturaSmMap();
  const dayKey = mexicoDayKey(now);
  const seleccionP = fetchSeleccionGamesOfDay(dayKey).catch(() => [] as Fixture[]);
  const window = await ligaMxDateWindow(dayKey);
  // El Tri schedule is ESPN — don't stall the Liga MX slate on it.
  const seleccion = await Promise.race([
    seleccionP,
    sleep(800).then(() => [] as Fixture[]),
  ]);

  const byId = new Map<string, Fixture>();
  for (const f of window.today) byId.set(`liga-${f.id}`, f);
  for (const f of seleccion) byId.set(`sel-${f.id}`, f);

  let games = sortDayGames(enrich([...byId.values()], now.getTime()));
  let source: GamesOfDayPayload['source'] =
    seleccion.length > 0 && window.source !== 'static' ? 'mixed' : window.source;
  let upcoming = false;
  let slateDay = dayKey;

  if (games.length === 0) {
    const fromWindow = firstUpcomingDay(window.dated, now.getTime());
    let next = fromWindow;
    if (!next) {
      const planned = upcomingFromStatic(now);
      if (planned.dayKey && sportmonksEnabled()) {
        try {
          const live = (
            await Promise.all(
              utcBoardKeys(planned.dayKey).map((k) =>
                fetchFixturesByDate(k, livingRoomLeagueIds())
              )
            )
          ).flat();
          next = firstUpcomingDay(
            live.filter(keepLivingRoomFixture).map(attachDondeVer),
            now.getTime()
          );
          if (next) source = 'sportmonks';
        } catch {
          /* static below */
        }
      }
      if (!next && planned.fixtures.length) {
        next = { fixtures: planned.fixtures, dayKey: planned.dayKey! };
        source = 'static';
      }
    }
    if (next) {
      games = sortDayGames(enrich(next.fixtures, now.getTime()));
      slateDay = next.dayKey;
      upcoming = games.length > 0;
    }
  }

  return {
    dayKey: slateDay,
    generatedAt: now.toISOString(),
    source,
    games,
    upcoming: upcoming || undefined,
  };
}
