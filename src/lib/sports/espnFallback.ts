import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { preferSportmonksId } from '@/fixtures/ligamx-apertura-2026';
import { smTeamIdFromAbbr } from './ligaMxTeams';
import {
  aperturaCalendar,
  refreshAperturaSmMap,
  rememberOverlaySmIds,
} from './aperturaSmMap';
import { mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { isNearKickoff } from './freshness';
import {
  fetchFixturesByDate,
  fetchLivescores,
  ligaMxLeagueId,
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

/** Date-board overlay for the current jornada window — never a season include. */
async function overlayNearDateBoards(seed: Fixture[]): Promise<Fixture[]> {
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
    if (t < now - 36 * 3600_000 || t > now + 8 * 86400_000) continue;
    days.add(mexicoDayKey(new Date(f.date)));
  }
  const boards = await Promise.all(
    utcKeysForMexicoDays(days).map((k) =>
      fetchFixturesByDate(k, [ligaMxLeagueId()]).catch(() => [] as Fixture[])
    )
  );
  return mergeLiveOntoStatic(boards.flat());
}

/** Static calendar + nearby Sportmonks date boards. Season include is not on this path. */
export async function fetchLigaMxFixtures(): Promise<{
  fixtures: Fixture[];
  source: 'sportmonks' | 'espn' | 'static';
}> {
  const seed = mapStatic();
  refreshAperturaSmMap();
  if (sportmonksEnabled()) {
    try {
      const dated = await overlayNearDateBoards(seed);
      const now = Date.now();
      const mayBeLive = dated.some(
        (f) => f.state === 'in' || isNearKickoff(f.date, now, f.state)
      );
      const live = mayBeLive
        ? await fetchLivescores([ligaMxLeagueId()]).catch(() => [] as Fixture[])
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
