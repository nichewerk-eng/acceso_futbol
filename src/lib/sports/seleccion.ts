import { singleFlight } from '@/lib/apiCache';
import { espnFetch } from '@/lib/espn';
import { attachDondeVer, type TvChannelId } from '@/config/dondeVer';
import { buildElTriBoard, channelsFor } from './elTriBoard';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { smFetch } from './sm/client';
import { sportmonksEnabled } from './sportmonks';
import type { Fixture, MatchState } from './types';
import { isMexicoDay, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';

const MEXICO_TEAM_ID = '203';
const SM_MEXICO_TEAM_ID = 18576;
const SM_COUNTRY_MX = 458;
const SM_COUNTRY_US = 3483;

const SCHEDULE_CACHE_KEY = 'seleccion-schedule-v5-curated-tv';
const SCHEDULE_TTL_MS = 30_000;
/** Two El Tri fixtures are never this close, so it safely pairs rows across providers. */
const SAME_MATCH_WINDOW_MS = 36 * 3_600_000;

/** Every ESPN competition feed El Tri plays in. Empty feeds cost one cached call. */
function espnFeeds(): { slug: string; query: string; competition: string }[] {
  const year = new Date().getUTCFullYear();
  return [
    { slug: 'fifa.friendly', query: `season=${year}`, competition: 'Amistosos internacionales' },
    { slug: 'fifa.friendly', query: 'fixture=true', competition: 'Amistosos internacionales' },
    { slug: 'fifa.world', query: '', competition: 'Copa del Mundo 2026' },
    { slug: 'concacaf.nations.league', query: 'fixture=true', competition: 'Nations League' },
    { slug: 'concacaf.gold', query: 'fixture=true', competition: 'Copa Oro' },
  ];
}

type CompetitorRaw = {
  homeAway: 'home' | 'away';
  team: { id?: string; displayName: string; abbreviation: string; logos?: { href: string }[] };
  score?: string | { displayValue?: string; value?: number };
};

type BroadcastRaw = {
  region?: string;
  media?: { shortName?: string; name?: string };
};

type StatusRaw = {
  displayClock?: string;
  type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string };
};

type EventRaw = {
  id: string;
  date: string;
  status?: StatusRaw;
  competitions?: {
    status?: StatusRaw;
    competitors: CompetitorRaw[];
    venue?: { fullName: string; address?: { city?: string } };
    broadcasts?: BroadcastRaw[];
  }[];
};

const STATION_RULES: [RegExp, TvChannelId][] = [
  [/^tudn/i, 'tudn'],
  [/^vix/i, 'vix'],
  [/canal\s*5/i, 'canal-5'],
  [/azteca\s*7/i, 'azteca-7'],
  [/^unim[aá]s/i, 'unimas'],
  [/^univision(?!\s*now)/i, 'univision'],
  [/^(telemundo|tele)$/i, 'telemundo'],
  [/^universo/i, 'universo'],
  [/^peacock/i, 'peacock'],
  [/^tnt/i, 'tnt'],
  [/^(hbo\s*)?max$/i, 'max'],
  [/^fox\s*deportes/i, 'fox-deportes'],
  [/^fox\s*one/i, 'fox-one'],
  [/^fs1$/i, 'fs1'],
  [/^fox$/i, 'fox'],
  [/^espn$/i, 'espn'],
  [/^disney/i, 'disney-plus'],
  [/prime\s*video|^amazon/i, 'prime-video'],
  [/^apple/i, 'apple-tv'],
  [/^imagen/i, 'imagen-tv'],
  [/^layv/i, 'layvtime'],
  [/^estrella/i, 'estrella-tv'],
  [/^televisa$/i, 'televisa'],
  [/^claro\s*sports?/i, 'claro-sports'],
];

function stationChannel(name?: string | null): TvChannelId | null {
  const n = name?.trim();
  if (!n) return null;
  return STATION_RULES.find(([re]) => re.test(n))?.[1] ?? null;
}

function uniq(ids: (TvChannelId | null)[]): TvChannelId[] {
  return [...new Set(ids.filter((id): id is TvChannelId => id != null))];
}

function toState(raw?: string, completed?: boolean): MatchState {
  if (completed || raw === 'post') return 'post';
  if (raw === 'in') return 'in';
  return 'pre';
}

function scoreOf(c?: CompetitorRaw): string | null {
  if (!c?.score) return null;
  if (typeof c.score === 'string') return c.score;
  return c.score.displayValue ?? (c.score.value != null ? String(c.score.value) : null);
}

function mapEvent(event: EventRaw, competition: string): { fixture: Fixture; usTv: TvChannelId[] } {
  const comp = event.competitions?.[0];
  const status = comp?.status ?? event.status;
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const state = toState(status?.type?.state, status?.type?.completed);
  const usTv = uniq(
    (comp?.broadcasts ?? [])
      .filter((b) => !b.region || b.region === 'us')
      .map((b) => stationChannel(b.media?.shortName) ?? stationChannel(b.media?.name))
  );
  const fixture: Fixture = {
    id: event.id,
    provider: 'espn',
    espnEventId: event.id,
    league: 'seleccion',
    date: event.date,
    jornada: competition,
    state,
    statusLabel:
      state === 'pre'
        ? 'Programado'
        : localizeStatus(status?.type?.shortDetail || status?.type?.description || null, state),
    clock: status?.displayClock,
    venue: localizeVenue(comp?.venue?.fullName),
    city: localizeCity(comp?.venue?.address?.city),
    home: {
      id: home?.team?.id ?? home?.team?.abbreviation ?? 'home',
      name: home?.team?.displayName ?? 'Local',
      abbreviation: home?.team?.abbreviation ?? 'LOC',
      logo: home?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : scoreOf(home),
    },
    away: {
      id: away?.team?.id ?? away?.team?.abbreviation ?? 'away',
      name: away?.team?.displayName ?? 'Visitante',
      abbreviation: away?.team?.abbreviation ?? 'VIS',
      logo: away?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : scoreOf(away),
    },
  };
  return { fixture, usTv };
}

async function fetchFeed(slug: string, query: string): Promise<EventRaw[]> {
  try {
    const raw = (await espnFetch(
      `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${slug}/teams/${MEXICO_TEAM_ID}/schedule?${query}`,
      { revalidate: 30 }
    )) as { events?: EventRaw[] };
    return raw.events ?? [];
  } catch {
    return [];
  }
}

/** `lang=es` renames abbreviations (USA → EUA) and drops broadcasts, so it only supplies names. */
function spanishNames(events: EventRaw[]): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const e of events) {
    const sides = new Map<string, string>();
    for (const c of e.competitions?.[0]?.competitors ?? []) {
      if (c.team?.displayName) sides.set(c.homeAway, c.team.displayName);
    }
    out.set(e.id, sides);
  }
  return out;
}

async function fetchEspnSchedule(): Promise<{ fixtures: Fixture[]; usTv: Map<string, TvChannelId[]> }> {
  const feeds = await Promise.all(
    espnFeeds().map(async (feed) => {
      const [events, es] = await Promise.all([
        fetchFeed(feed.slug, feed.query),
        fetchFeed(feed.slug, ['lang=es', 'region=mx', feed.query].filter(Boolean).join('&')),
      ]);
      const names = spanishNames(es);
      return events.map((e) => {
        const row = mapEvent(e, feed.competition);
        const n = names.get(e.id);
        if (n?.get('home')) row.fixture.home.name = n.get('home')!;
        if (n?.get('away')) row.fixture.away.name = n.get('away')!;
        return row;
      });
    })
  );
  const byId = new Map<string, Fixture>();
  const usTv = new Map<string, TvChannelId[]>();
  for (const { fixture, usTv: tv } of feeds.flat()) {
    // `fixture=true` rows carry the fresher state for upcoming games.
    byId.set(fixture.id, fixture);
    if (tv.length) usTv.set(fixture.id, tv);
  }
  return { fixtures: [...byId.values()], usTv };
}

type SmTvFixture = {
  id: number;
  starting_at_timestamp?: number;
  starting_at?: string;
  tvstations?: { country_id?: number; tvstation?: { name?: string } }[];
};

type SmTvListing = { at: number; mx: TvChannelId[]; us: TvChannelId[] };

/** Sportmonks per-country TV listings for El Tri, recent past through the next FIFA windows. */
async function fetchSportmonksTv(): Promise<SmTvListing[]> {
  if (!sportmonksEnabled()) return [];
  const today = mexicoDayKey();
  try {
    const data = await smFetch<{ data?: SmTvFixture[] }>(
      `/fixtures/between/${shiftDayKey(today, -14)}/${shiftDayKey(today, 85)}/${SM_MEXICO_TEAM_ID}`,
      { include: 'tvStations.tvStation' },
      'board'
    );
    return (data.data ?? []).map((f) => {
      const rows = f.tvstations ?? [];
      const pick = (country: number) =>
        uniq(rows.filter((r) => r.country_id === country).map((r) => stationChannel(r.tvstation?.name)));
      return {
        at: f.starting_at_timestamp
          ? f.starting_at_timestamp * 1000
          : Date.parse(`${f.starting_at?.replace(' ', 'T')}Z`),
        mx: pick(SM_COUNTRY_MX),
        us: pick(SM_COUNTRY_US),
      };
    });
  } catch {
    return [];
  }
}

function nearest<T extends { at: number }>(rows: T[], iso: string): T | undefined {
  const t = +new Date(iso);
  let best: T | undefined;
  for (const r of rows) {
    const d = Math.abs(r.at - t);
    if (d <= SAME_MATCH_WINDOW_MS && (!best || d < Math.abs(best.at - t))) best = r;
  }
  return best;
}

/** Curated board listings win; provider listings fill a side the board leaves empty. */
function withTv(f: Fixture, espnUs: TvChannelId[], sm?: SmTvListing): Fixture {
  const curMx = (f.dondeVer?.mxChannels ?? []) as TvChannelId[];
  const curUs = (f.dondeVer?.usChannels ?? []) as TvChannelId[];
  const liveUs = uniq([...(sm?.us ?? []), ...espnUs]);
  return {
    ...f,
    dondeVer: channelsFor({
      mx: curMx.length ? curMx : (sm?.mx ?? []),
      us: curUs.length ? curUs : liveUs,
    }),
  };
}

async function loadSeleccionSchedule(): Promise<Fixture[]> {
  const [espn, tv] = await Promise.all([fetchEspnSchedule(), fetchSportmonksTv()]);
  const board = buildElTriBoard(espn.fixtures);
  const claimed = new Set(board.map((f) => f.espnEventId).filter(Boolean));
  const extras = espn.fixtures.filter((f) => !claimed.has(f.id));
  return [...board, ...extras]
    .map((f) => withTv(f, espn.usTv.get(f.espnEventId ?? '') ?? [], nearest(tv, f.date)))
    .map(attachDondeVer)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/**
 * Every El Tri match this year: official board rows (stable `el-tri-…` ids)
 * with ESPN kickoff / score / state and Sportmonks + ESPN TV overlaid, plus
 * every other ESPN fixture (World Cup, earlier friendlies, Copa Oro…).
 */
export async function fetchSeleccionSchedule(): Promise<Fixture[]> {
  try {
    return await singleFlight(SCHEDULE_CACHE_KEY, SCHEDULE_TTL_MS, loadSeleccionSchedule);
  } catch {
    return buildElTriBoard([]);
  }
}

/** Board row for a match page id — official `el-tri-…` id or a raw ESPN event id. */
export async function findSeleccionFixture(id: string): Promise<Fixture | null> {
  const all = await fetchSeleccionSchedule();
  return all.find((f) => f.id === id || f.espnEventId === id) ?? null;
}

/** Mexico national team fixtures for the Mexico City calendar day. */
export async function fetchSeleccionGamesOfDay(dayKey = mexicoDayKey()): Promise<Fixture[]> {
  const all = await fetchSeleccionSchedule();
  return all.filter(
    (f) => isMexicoDay(f.date, dayKey) || f.scheduleDay === dayKey || f.state === 'in'
  );
}
