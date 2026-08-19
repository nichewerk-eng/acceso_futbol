import { isMexicoDay, mexicoDayKey, radioPhase, type RadioPhase } from '@/lib/radio/phases';
import type { DayGame, GamesOfDayPayload } from '@/lib/sports/gamesOfDay';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

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

function asDayGame(f: Fixture, now: number): DayGame {
  const phase = radioPhase(f, now);
  return { ...f, phase, ...radioMeta(phase, f.state) };
}

function firstUpcomingDay(
  pool: Fixture[],
  nowMs: number
): { fixtures: Fixture[]; dayKey: string } | null {
  const future = pool
    .filter((f) => f.state === 'pre' && +new Date(f.date) > nowMs)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (!future.length) return null;
  const dayKey = mexicoDayKey(new Date(future[0].date));
  return {
    fixtures: future.filter((f) => isMexicoDay(f.date, dayKey)),
    dayKey,
  };
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

/**
 * Liga MX hero rows come from the jornada board (same dates as Dónde ver).
 * Keeps Leagues Cup / Selección rows from games-of-day for that slate day.
 *
 * The games-of-day route can flash a static-calendar seed (wrong Friday pairs
 * after Sportmonks moved kickoffs). Overlaying only scores left that stale slate.
 */
export function mergeJornadaIntoHeroSlate(
  payload: GamesOfDayPayload | null,
  jornada: JornadaOverview | null,
  now = Date.now()
): GamesOfDayPayload | null {
  if (!jornada) return payload;
  const board = [...jornada.live, ...jornada.played, ...jornada.upcoming];
  if (!board.length) return payload;

  const todayKey = mexicoDayKey(new Date(now));
  const todayGames = board.filter((f) => isMexicoDay(f.date, todayKey) || f.state === 'in');

  let liga: Fixture[];
  let dayKey = todayKey;
  let upcoming = false;

  if (todayGames.length > 0) {
    liga = todayGames;
  } else {
    const next = firstUpcomingDay(board, now);
    if (!next) return payload;
    liga = next.fixtures;
    dayKey = next.dayKey;
    upcoming = true;
  }

  const extras = (payload?.games ?? []).filter(
    (g) => g.league !== 'liga-mx' && (isMexicoDay(g.date, dayKey) || g.state === 'in')
  );

  const games = sortDayGames([...liga.map((f) => asDayGame(f, now)), ...extras]);
  const mixed = extras.length > 0 && jornada.source !== 'static';

  return {
    dayKey,
    generatedAt: payload?.generatedAt ?? jornada.generatedAt,
    source: mixed ? 'mixed' : jornada.source,
    games,
    upcoming: upcoming || undefined,
  };
}
