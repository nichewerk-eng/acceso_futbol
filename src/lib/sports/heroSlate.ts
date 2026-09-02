import { isMexicoDay, mexicoDayKey, radioPhase, type RadioPhase } from '@/lib/radio/phases';
import type { DayGame, GamesOfDayPayload } from '@/lib/sports/gamesOfDay';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';
import { isFixtureHeld } from '@/lib/sports/localizeEs';

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
    .filter((f) => f.state === 'pre' && !isFixtureHeld(f.statusLabel) && +new Date(f.date) > nowMs)
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
 * Leagues Cup / Selección come from games-of-day. The slate *day* is the
 * soonest living-room day — not the next Liga MX jornada when a cup match
 * is earlier (e.g. LC cuartos martes vs Liga MX viernes).
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
  const board = [...jornada.live, ...jornada.played, ...jornada.upcoming].filter(
    (f) => !isFixtureHeld(f.statusLabel)
  );
  const extrasPool = (payload?.games ?? []).filter((g) => g.league !== 'liga-mx');
  if (!board.length) return payload;

  const todayKey = mexicoDayKey(new Date(now));
  const ligaToday = board.filter((f) => isMexicoDay(f.date, todayKey) || f.state === 'in');
  const extrasToday = extrasPool.filter(
    (g) => isMexicoDay(g.date, todayKey) || g.state === 'in'
  );

  let liga: Fixture[] = [];
  let extras: DayGame[] = [];
  let dayKey = todayKey;
  let upcoming = false;

  if (ligaToday.length > 0 || extrasToday.length > 0) {
    liga = ligaToday;
    extras = extrasToday;
  } else {
    const nextLiga = firstUpcomingDay(board, now);
    const nextExtra = firstUpcomingDay(extrasPool, now);
    const days = [nextLiga?.dayKey, nextExtra?.dayKey].filter(
      (d): d is string => Boolean(d)
    );
    if (days.length === 0) return payload;
    dayKey = days.sort()[0]!;
    upcoming = dayKey !== todayKey;
    liga = board.filter((f) => isMexicoDay(f.date, dayKey));
    extras = extrasPool.filter((g) => isMexicoDay(g.date, dayKey) || g.state === 'in');
  }

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
