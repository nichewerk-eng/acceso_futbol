import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { preferSportmonksId } from '@/fixtures/ligamx-apertura-2026';
import { smTeamIdFromAbbr } from './ligaMxTeams';
import {
  aperturaCalendar,
  refreshAperturaSmMap,
  rememberOverlaySmIds,
} from './aperturaSmMap';
import { mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { peekCache, singleFlight } from '@/lib/apiCache';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { apiTtlMsForPace, isNearKickoff, looksStillLive, paceFromFixtures } from './freshness';
import {
  fetchFixturesByDate,
  fetchLigaMxSeasonFixtures,
  fetchLivescores,
  ligaMxLeagueId,
  livingRoomLeagueIds,
  overlayLiveFixtures,
  sportmonksEnabled,
} from './sportmonks';
import type { Fixture, FixtureScorer, MatchState } from './types';

const DATE_RANGE = '20260701-20261231';

interface CompetitorRaw {
  homeAway: 'home' | 'away';
  winner?: boolean;
  team: { id?: string; displayName: string; abbreviation: string; logos?: { href: string }[] };
  score?: string;
}

interface DetailRaw {
  scoringPlay?: boolean;
  penaltyKick?: boolean;
  ownGoal?: boolean;
  clock?: { displayValue?: string };
  team?: { id?: string };
  athletesInvolved?: {
    shortName?: string;
    displayName?: string;
    team?: { id?: string };
  }[];
}

interface EventRaw {
  id: string;
  date: string;
  week?: { number: number };
  status?: {
    displayClock?: string;
    type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string };
  };
  competitions?: {
    competitors: CompetitorRaw[];
    details?: DetailRaw[];
    venue?: { fullName: string; address?: { city?: string } };
  }[];
}

function toState(raw?: string, completed?: boolean): MatchState {
  if (completed || raw === 'post') return 'post';
  if (raw === 'in') return 'in';
  return 'pre';
}

function winnerSideOf(
  home?: CompetitorRaw,
  away?: CompetitorRaw,
  state: MatchState = 'pre'
): 'home' | 'away' | null {
  if (state === 'pre') return null;
  if (home?.winner) return 'home';
  if (away?.winner) return 'away';
  const hs = Number(home?.score);
  const as = Number(away?.score);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
  if (hs > as) return 'home';
  if (as > hs) return 'away';
  return null; // draw / level
}

function mapScorers(
  details: DetailRaw[] | undefined,
  homeId: string,
  awayId: string
): FixtureScorer[] {
  return (details ?? [])
    .filter((d) => d.scoringPlay)
    .map((d) => {
      const athlete = d.athletesInvolved?.[0];
      const teamId = d.team?.id ?? athlete?.team?.id;
      let side: 'home' | 'away' = 'home';
      if (teamId === awayId) side = 'away';
      else if (teamId === homeId) side = 'home';
      return {
        name: athlete?.shortName || athlete?.displayName || 'Gol',
        minute: d.clock?.displayValue ?? '',
        side,
        pen: Boolean(d.penaltyKick),
        og: Boolean(d.ownGoal),
      };
    });
}

function mapEvent(event: EventRaw): Fixture {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const state = toState(event.status?.type?.state, event.status?.type?.completed);
  const homeId = home?.team?.id ?? '';
  const awayId = away?.team?.id ?? '';
  return {
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
    winnerSide: winnerSideOf(home, away, state),
    scorers: mapScorers(comp?.details, homeId, awayId),
    home: {
      id: home?.team?.id ?? home?.team?.abbreviation ?? 'home',
      name: home?.team?.displayName ?? 'Local',
      abbreviation: home?.team?.abbreviation ?? 'LOC',
      logo: home?.team?.logos?.[0]?.href,
      score: home?.score ?? null,
    },
    away: {
      id: away?.team?.id ?? away?.team?.abbreviation ?? 'away',
      name: away?.team?.displayName ?? 'Visitante',
      abbreviation: away?.team?.abbreviation ?? 'VIS',
      logo: away?.team?.logos?.[0]?.href,
      score: away?.score ?? null,
    },
  };
}

function mapStatic(): Fixture[] {
  return aperturaCalendar().map((f) => ({
    id: f.id,
    provider: 'espn' as const,
    league: 'liga-mx' as const,
    date: f.date,
    jornada: f.jornada,
    state: toState(f.status.state, f.status.completed),
    statusLabel: f.status.shortDetail || f.status.description || 'Próximo',
    clock: f.status.displayClock,
    venue: f.venue,
    city: f.city,
    home: {
      id: smTeamIdFromAbbr(f.home.abbreviation) ?? f.home.abbreviation,
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score,
    },
    away: {
      id: smTeamIdFromAbbr(f.away.abbreviation) ?? f.away.abbreviation,
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: f.away.score,
    },
  }));
}

/**
 * Static schedule owns jornada labels; ESPN overlays live state, scores, and real ids.
 * Match by Mexico-City calendar day + normalized abbreviations (ESPN abbrs differ).
 */
function jornadaNum(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function jornadaPairKey(
  jornada: string | null | undefined,
  homeAbbr: string,
  awayAbbr: string
): string | null {
  const n = jornadaNum(jornada);
  if (n === null) return null;
  return `${n}|${scheduleAbbr(homeAbbr)}|${scheduleAbbr(awayAbbr)}`;
}

function mergeLiveOntoStatic(live: Fixture[]): Fixture[] {
  const byDay = new Map(
    live.map((f) => [
      dayPairKey(f.date, scheduleAbbr(f.home.abbreviation), scheduleAbbr(f.away.abbreviation)),
      f,
    ])
  );
  const byJornada = new Map<string, Fixture>();
  for (const f of live) {
    const jk = jornadaPairKey(f.jornada, f.home.abbreviation, f.away.abbreviation);
    if (jk) byJornada.set(jk, f);
  }
  const seed = mapStatic();
  const usedLive = new Set<string>();

  const merged = seed.map((s) => {
    const dayKey = dayPairKey(s.date, s.home.abbreviation, s.away.abbreviation);
    const jk = jornadaPairKey(s.jornada, s.home.abbreviation, s.away.abbreviation);
    const overlay = byDay.get(dayKey) ?? (jk ? byJornada.get(jk) : undefined);
    if (!overlay) return s;
    usedLive.add(overlay.id);
    return {
      ...s,
      id: preferSportmonksId(s.id, overlay.id),
      provider: overlay.provider,
      date: overlay.date,
      state: overlay.state,
      statusLabel: overlay.statusLabel,
      clock: overlay.clock,
      jornada: s.jornada ?? overlay.jornada,
      venue: overlay.venue ?? s.venue,
      city: overlay.city ?? s.city,
      winnerSide: overlay.winnerSide,
      scorers: overlay.scorers,
      home: {
        ...s.home,
        id: overlay.home.id,
        logo: overlay.home.logo,
        score: overlay.home.score,
      },
      away: {
        ...s.away,
        id: overlay.away.id,
        logo: overlay.away.logo,
        score: overlay.away.score,
      },
    };
  });

  rememberOverlaySmIds(seed, merged);

  for (const f of live) {
    if (!usedLive.has(f.id) && f.jornada) merged.push(f);
  }

  return merged;
}

export async function fetchEspnLigaMxFixtures(): Promise<{ fixtures: Fixture[]; source: 'espn' | 'static' }> {
  try {
    const raw = (await espnFetch(scoreboardUrl(SLUG.LIGA_MX, DATE_RANGE))) as { events?: EventRaw[] };
    const espn = (raw.events ?? []).map(mapEvent);
    if (espn.length === 0) return { fixtures: mapStatic(), source: 'static' };
    return { fixtures: mergeLiveOntoStatic(espn), source: 'espn' };
  } catch {
    return { fixtures: mapStatic(), source: 'static' };
  }
}

export function seedLigaMxFixtures(): Fixture[] {
  return mapStatic();
}

function utcKeysForMexicoDays(days: Iterable<string>): string[] {
  const keys = new Set<string>();
  for (const d of days) {
    keys.add(d);
    keys.add(shiftDayKey(d, 1));
  }
  return [...keys];
}

/** Live / upcoming window — date boards, not a season include. */
const DATE_BOARD_PAST_MS = 36 * 3600_000;
const DATE_BOARD_FUTURE_MS = 8 * 86400_000;
/** If the season dump has no FT rows, walk back through Jornada 1. */
const DATE_BOARD_SEASON_PAST_MS = 45 * 86400_000;

async function fetchDateBoardFixtures(seed: Fixture[], pastMs: number): Promise<Fixture[]> {
  const now = Date.now();
  const days = new Set<string>();
  const today = mexicoDayKey(new Date(now));
  days.add(shiftDayKey(today, -1));
  days.add(today);
  days.add(shiftDayKey(today, 1));
  days.add(shiftDayKey(today, 2));
  for (const f of seed) {
    const t = +new Date(f.date);
    if (!Number.isFinite(t)) continue;
    if (t < now - pastMs || t > now + DATE_BOARD_FUTURE_MS) continue;
    days.add(mexicoDayKey(new Date(f.date)));
  }
  const boards = await Promise.all(
    utcKeysForMexicoDays(days).map((k) =>
      fetchFixturesByDate(k, [ligaMxLeagueId()]).catch(() => [] as Fixture[])
    )
  );
  return boards.flat();
}

type LigaMxBoard = { fixtures: Fixture[]; source: 'sportmonks' | 'espn' | 'static' };

/** Canonical Liga MX board key — one merged snapshot shared across every surface (and isolates via KV). */
const BOARD_KEY = 'liga-mx-board-v1';

/**
 * Static calendar + season FT scores + nearby date boards / livescores.
 *
 * This is the single source of truth for Liga MX scores: jornada, pulse, the
 * Liga MX page, and club boards all read this one cached, KV-shared board so
 * they can never disagree on a live score. Live rows come from the shared
 * living-room `/livescores` sticky board (same one games-of-day overlays).
 */
export async function fetchLigaMxFixtures(): Promise<LigaMxBoard> {
  const prev = peekCache<LigaMxBoard>(BOARD_KEY);
  const pace = prev ? paceFromFixtures(prev.fixtures) : 'near';
  return singleFlight(BOARD_KEY, apiTtlMsForPace(pace), buildLigaMxBoard);
}

async function buildLigaMxBoard(): Promise<LigaMxBoard> {
  const seed = mapStatic();
  refreshAperturaSmMap();
  if (sportmonksEnabled()) {
    try {
      const [season, near] = await Promise.all([
        fetchLigaMxSeasonFixtures().catch(() => [] as Fixture[]),
        fetchDateBoardFixtures(seed, DATE_BOARD_PAST_MS),
      ]);
      const hasFt = season.some((f) => f.state === 'post');
      const past = hasFt ? [] : await fetchDateBoardFixtures(seed, DATE_BOARD_SEASON_PAST_MS);
      // Later overlays win (near date boards are fresher than the season dump).
      const dated = mergeLiveOntoStatic([...season, ...past, ...near]);
      const now = Date.now();
      const mayBeLive = dated.some(
        (f) => looksStillLive(f) || isNearKickoff(f.date, now, f.state)
      );
      // One shared livescores fetch (living-room scope); keep only Liga MX rows here.
      const live = mayBeLive
        ? (await fetchLivescores(livingRoomLeagueIds()).catch(() => [] as Fixture[])).filter(
            (f) => f.league === 'liga-mx'
          )
        : [];
      const fixtures = live.length ? overlayLiveFixtures(dated, live) : dated;
      const hasSm = fixtures.some((f) => f.provider === 'sportmonks' || /^\d+$/.test(f.id));
      return { fixtures, source: hasSm ? 'sportmonks' : 'static' };
    } catch {
      /* fall through */
    }
  }
  return fetchEspnLigaMxFixtures();
}

