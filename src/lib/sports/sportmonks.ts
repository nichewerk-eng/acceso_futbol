import { getCache, setCache } from '@/lib/apiCache';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import { localizeComment } from './localizeComment';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import type {
  CommentaryLine,
  Fixture,
  FixtureScorer,
  FormMatch,
  FormResult,
  HeadToHeadMeeting,
  HeadToHeadSummary,
  LineupPlayer,
  LineupPos,
  LiveEvent,
  LiveEventKind,
  MatchSnapshot,
  MatchState,
  TeamLineup,
} from './types';

const BASE = 'https://api.sportmonks.com/v3/football';
const TIMEOUT_MS = 12_000;
const SEASON_CACHE_KEY = 'sm-ligamx-season-fixtures-v4-es';
const SEASON_TTL_MS = 5 * 60_000;
const STANDINGS_CACHE_KEY = 'sm-ligamx-standings-v1';
const STANDINGS_TTL_MS = 60_000;

/** Sportmonks Liga MX league id (Mexico · domestic). */
export function ligaMxLeagueId(): number {
  return 743;
}

/** Apertura 2026 / season 2026-2027. */
export function ligaMxSeasonId(): number {
  return 28009;
}

export function sportmonksEnabled(): boolean {
  return Boolean(process.env.SPORTMONKS_API_TOKEN?.trim());
}

async function smFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  if (!token) throw new Error('SPORTMONKS_API_TOKEN missing');

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_token', token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      next: { revalidate: 15 },
    });
    if (!res.ok) throw new Error(`Sportmonks HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

interface SmParticipant {
  id: number;
  name: string;
  short_code?: string;
  image_path?: string;
  meta?: { location?: string; winner?: boolean };
}

interface SmScore {
  description?: string;
  score?: { goals?: number; participant?: string };
}

interface SmEvent {
  id: number;
  type_id?: number;
  info?: string | null;
  addition?: string | null;
  minute?: number;
  extra_minute?: number | null;
  result?: string | null;
  player_name?: string | null;
  related_player_name?: string | null;
  section?: string | null;
  participant_id?: number;
  type?: { id?: number; name?: string; code?: string; developer_name?: string };
}

interface SmComment {
  id: number;
  order?: number;
  minute?: number | null;
  comment?: string;
  is_goal?: boolean;
}

interface SmStatistic {
  id?: number;
  type_id?: number;
  participant_id?: number;
  location?: 'home' | 'away' | string;
  data?: { value?: string | number | null };
  type?: { id?: number; name?: string; code?: string; developer_name?: string };
}

interface SmLineup {
  id?: number;
  player_id?: number;
  team_id?: number;
  position_id?: number;
  type_id?: number;
  formation_position?: number | null;
  player_name?: string | null;
  jersey_number?: number | null;
  type?: { id?: number; name?: string; code?: string; developer_name?: string };
  player?: { display_name?: string; name?: string; common_name?: string };
}

interface SmRefereeRow {
  type_id?: number;
  referee?: { display_name?: string; name?: string; common_name?: string };
}

interface SmFormation {
  participant_id?: number;
  formation?: string;
  location?: string;
}

interface SmFixture {
  id: number;
  starting_at?: string;
  starting_at_timestamp?: number;
  name?: string;
  result_info?: string | null;
  state?: { id?: number; state?: string; short_name?: string; name?: string };
  participants?: SmParticipant[];
  scores?: SmScore[];
  events?: SmEvent[];
  comments?: SmComment[];
  statistics?: SmStatistic[];
  lineups?: SmLineup[];
  referees?: SmRefereeRow[];
  formations?: SmFormation[];
  venue?: { name?: string; city_name?: string };
  round?: { name?: string };
  league?: { id?: number; name?: string };
}

function mapState(raw?: string): MatchState {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('inplay') || s === 'live' || s === '1st' || s === '2nd' || s === 'ht') return 'in';
  if (s.includes('ft') || s.includes('full') || s === 'finished' || s === 'completed') return 'post';
  return 'pre';
}

function scoreFor(scores: SmScore[] | undefined, side: 'home' | 'away'): string | null {
  if (!scores?.length) return null;
  const bySide = scores.filter((x) => (x.score?.participant ?? '').toLowerCase() === side);
  if (!bySide.length) return null;
  const preferred =
    bySide.find((x) => (x.description ?? '').toUpperCase() === 'CURRENT') ??
    bySide.find((x) => (x.description ?? '').toUpperCase() === '2ND_HALF') ??
    bySide.find((x) => (x.description ?? '').toUpperCase() === '1ST_HALF') ??
    bySide[bySide.length - 1];
  const g = preferred?.score?.goals;
  return g !== undefined && g !== null ? String(g) : null;
}

function participantSide(p: SmParticipant): 'home' | 'away' {
  return p.meta?.location === 'away' ? 'away' : 'home';
}

export function mapFixture(f: SmFixture): Fixture {
  const parts = f.participants ?? [];
  const homeP = parts.find((p) => participantSide(p) === 'home') ?? parts[0];
  const awayP = parts.find((p) => participantSide(p) === 'away') ?? parts[1];
  const state = mapState(f.state?.state ?? f.state?.short_name ?? f.state?.name);

  const homeScore = scoreFor(f.scores, 'home');
  const awayScore = scoreFor(f.scores, 'away');

  const roundName = f.round?.name?.trim();
  const jornada = roundName
    ? /jornada/i.test(roundName)
      ? roundName
      : `Jornada ${roundName}`
    : null;

  return {
    id: String(f.id),
    provider: 'sportmonks',
    league: 'liga-mx',
    date: f.starting_at ? `${f.starting_at.replace(' ', 'T')}Z` : new Date().toISOString(),
    jornada,
    state,
    statusLabel: localizeStatus(
      f.state?.name ?? f.state?.short_name ?? null,
      state
    ),
    venue: localizeVenue(f.venue?.name),
    city: localizeCity(f.venue?.city_name),
    home: {
      id: String(homeP?.id ?? 'home'),
      name: homeP?.name ?? 'Local',
      abbreviation: scheduleAbbr(homeP?.short_code ?? 'LOC'),
      logo: homeP?.image_path,
      score: state === 'pre' ? null : homeScore,
    },
    away: {
      id: String(awayP?.id ?? 'away'),
      name: awayP?.name ?? 'Visitante',
      abbreviation: scheduleAbbr(awayP?.short_code ?? 'VIS'),
      logo: awayP?.image_path,
      score: state === 'pre' ? null : awayScore,
    },
  };
}

function shortName(raw?: string | null): string {
  if (!raw) return '';
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function eventKind(dev?: string, code?: string): LiveEventKind {
  const key = (dev || code || '').toUpperCase();
  if (key.includes('OWN') && key.includes('GOAL')) return 'own_goal';
  if (key.includes('PENALTY') && key.includes('MISS')) return 'other';
  if (key.includes('PENALTY')) return 'penalty';
  if (key === 'GOAL' || key === 'GOALS') return 'goal';
  if (key.includes('YELLOWRED') || key === 'YELLOWREDCARD') return 'red';
  if (key.includes('YELLOW')) return 'yellow';
  if (key.includes('RED')) return 'red';
  if (key.includes('SUBSTITUTION') || key === 'SUBSTITUTE') return 'sub';
  if (key.includes('VAR')) return 'var';
  return 'other';
}

function eventTypeLabel(kind: LiveEventKind, fallback?: string | null): string {
  switch (kind) {
    case 'goal':
      return 'Gol';
    case 'own_goal':
      return 'Autogol';
    case 'penalty':
      return 'Penal';
    case 'yellow':
      return 'Amarilla';
    case 'red':
      return 'Roja';
    case 'sub':
      return 'Cambio';
    case 'var':
      return 'VAR';
    default:
      return fallback?.trim() || 'Jugada';
  }
}

function mapEvents(
  events: SmEvent[] | undefined,
  homeId?: string,
  awayId?: string,
  homeAbbr?: string,
  awayAbbr?: string
): LiveEvent[] {
  return (events ?? [])
    .map((e) => {
      const kind = eventKind(e.type?.developer_name, e.type?.code);
      const type = eventTypeLabel(kind, e.type?.name || e.info);
      const player = shortName(e.player_name);
      const related = shortName(e.related_player_name);
      let text = player || type;
      if (kind === 'sub' && player && related) text = `${player} entra por ${related}`;
      else if (kind === 'goal' && related) text = `${player} · asistencia ${related}`;
      else if (kind === 'goal' && player) text = player;
      else if ((kind === 'yellow' || kind === 'red') && player) text = player;
      else if (player && e.info) text = `${player}: ${e.info}`;
      else if (player) text = player;

      const pid = e.participant_id !== undefined ? String(e.participant_id) : '';
      let side: 'home' | 'away' | undefined;
      let teamAbbr: string | undefined;
      if (pid && pid === homeId) {
        side = 'home';
        teamAbbr = homeAbbr;
      } else if (pid && pid === awayId) {
        side = 'away';
        teamAbbr = awayAbbr;
      }

      const clock =
        e.minute !== undefined
          ? `${e.minute}${e.extra_minute ? `+${e.extra_minute}` : ''}'`
          : '';

      return {
        id: String(e.id),
        period: e.section === '2nd' ? 2 : 1,
        clock,
        minute: e.minute ?? undefined,
        extraMinute: e.extra_minute ?? undefined,
        type,
        kind,
        text,
        teamAbbr,
        side,
        playerName: player || undefined,
        relatedPlayerName: related || undefined,
      };
    })
    .sort((a, b) => {
      const am = (a.minute ?? 0) * 100 + (a.extraMinute ?? 0);
      const bm = (b.minute ?? 0) * 100 + (b.extraMinute ?? 0);
      return am - bm;
    });
}

function scorersFromEvents(events: LiveEvent[]): FixtureScorer[] {
  return events
    .filter((e) => e.kind === 'goal' || e.kind === 'penalty' || e.kind === 'own_goal')
    .map((e) => ({
      name: e.playerName || e.text,
      minute: e.clock.replace(/'$/, ''),
      side: e.side === 'away' ? 'away' : 'home',
      pen: e.kind === 'penalty',
      og: e.kind === 'own_goal',
    }));
}

function mapComments(comments: SmComment[] | undefined): CommentaryLine[] {
  return (comments ?? [])
    .map((c) => {
      const raw = (c.comment ?? '').trim();
      return {
        id: String(c.id),
        minute: c.minute ?? undefined,
        order: c.order,
        text: localizeComment(raw),
        isGoal: Boolean(c.is_goal) || /\b(goal|gol)\b/i.test(raw),
      };
    })
    .filter((c) => c.text)
    .sort((a, b) => (a.order ?? a.minute ?? 0) - (b.order ?? b.minute ?? 0));
}

function mapPosition(positionId?: number): { pos: LineupPos; label: string } {
  switch (positionId) {
    case 24:
      return { pos: 'GK', label: 'Portero' };
    case 25:
      return { pos: 'DEF', label: 'Defensa' };
    case 26:
      return { pos: 'MID', label: 'Medio' };
    case 27:
    case 28:
      return { pos: 'FWD', label: 'Delantero' };
    default:
      return { pos: '?', label: 'Jugador' };
  }
}

function mapReferee(rows: SmRefereeRow[] | undefined): string | null {
  if (!rows?.length) return null;
  // type_id 6 = main referee in Sportmonks football
  const main = rows.find((r) => r.type_id === 6) ?? rows[0];
  return (
    main.referee?.display_name ||
    main.referee?.name ||
    main.referee?.common_name ||
    null
  );
}

function mapLineups(
  lineups: SmLineup[] | undefined,
  formations: SmFormation[] | undefined,
  homeId: string,
  awayId: string,
  homeName: string,
  awayName: string,
  homeAbbr: string,
  awayAbbr: string
): TeamLineup[] {
  if (!lineups?.length) return [];

  const formationFor = (teamId: string, side: 'home' | 'away') =>
    formations?.find(
      (f) =>
        String(f.participant_id) === teamId ||
        (f.location ?? '').toLowerCase() === side
    )?.formation ?? null;

  const buildSide = (side: 'home' | 'away', teamId: string, teamName: string, abbr: string): TeamLineup => {
    const rows = lineups.filter((l) => String(l.team_id) === teamId);
    const players: LineupPlayer[] = rows.map((l) => {
      const dev = (l.type?.developer_name || l.type?.code || '').toUpperCase();
      const role = l.type_id === 12 || dev.includes('BENCH') ? 'bench' : 'starter';
      const { pos, label } = mapPosition(l.position_id);
      const name =
        l.player_name ||
        l.player?.display_name ||
        l.player?.name ||
        l.player?.common_name ||
        'Jugador';
      return {
        id: String(l.player_id ?? l.id ?? name),
        name: shortName(name),
        jersey: l.jersey_number ?? null,
        position: pos,
        positionLabel: label,
        role,
        side,
      };
    });

    const starters = players
      .filter((p) => p.role === 'starter')
      .sort((a, b) => {
        const order = { GK: 0, DEF: 1, MID: 2, FWD: 3, '?': 4 } as const;
        if (order[a.position] !== order[b.position]) return order[a.position] - order[b.position];
        return (a.jersey ?? 99) - (b.jersey ?? 99);
      });
    const bench = players
      .filter((p) => p.role === 'bench')
      .sort((a, b) => (a.jersey ?? 99) - (b.jersey ?? 99));

    return {
      side,
      teamName,
      abbreviation: abbr,
      formation: formationFor(teamId, side),
      starters,
      bench,
    };
  };

  return [
    buildSide('home', homeId, homeName, homeAbbr),
    buildSide('away', awayId, awayName, awayAbbr),
  ].filter((t) => t.starters.length + t.bench.length > 0);
}

function mapStatistics(
  statistics: SmStatistic[] | undefined
): { label: string; home: string; away: string }[] {
  if (!statistics?.length) return [];
  const byLabel = new Map<string, { home: string; away: string }>();
  for (const s of statistics) {
    const label = s.type?.name || s.type?.developer_name || s.type?.code;
    if (!label) continue;
    const side = (s.location ?? '').toLowerCase() === 'away' ? 'away' : 'home';
    const value = s.data?.value;
    const row = byLabel.get(label) ?? { home: '', away: '' };
    row[side] = value === undefined || value === null ? '' : String(value);
    byLabel.set(label, row);
  }
  return [...byLabel.entries()].map(([label, v]) => ({ label, ...v }));
}

/** In-play + near kickoff fixtures for selected leagues. */
export async function fetchLivescores(leagueIds: number[] = [ligaMxLeagueId()]): Promise<Fixture[]> {
  const include = 'participants;scores;state;venue;round;league';
  const data = await smFetch<{ data?: SmFixture[] }>('/livescores', {
    include,
    filters: `fixtureLeagues:${leagueIds.join(',')}`,
  });
  return (data.data ?? []).map(mapFixture);
}

export async function fetchFixturesByDate(
  dateYYYYMMDD: string,
  leagueIds: number[] = [ligaMxLeagueId()]
): Promise<Fixture[]> {
  const include = 'participants;scores;state;venue;round;league';
  const data = await smFetch<{ data?: SmFixture[] }>(`/fixtures/date/${dateYYYYMMDD}`, {
    include,
    filters: `fixtureLeagues:${leagueIds.join(',')}`,
  });
  return (data.data ?? []).map(mapFixture);
}

/** Full current Liga MX season (Apertura) via season include. */
export async function fetchLigaMxSeasonFixtures(): Promise<Fixture[]> {
  const cached = getCache<Fixture[]>(SEASON_CACHE_KEY, SEASON_TTL_MS);
  if (cached) return cached;

  const data = await smFetch<{ data?: { fixtures?: SmFixture[] } }>(
    `/seasons/${ligaMxSeasonId()}`,
    {
      include: 'fixtures.participants;fixtures.scores;fixtures.state;fixtures.round;fixtures.venue',
    }
  );
  const fixtures = (data.data?.fixtures ?? []).map(mapFixture);
  setCache(SEASON_CACHE_KEY, fixtures);
  return fixtures;
}

export function findFixtureByDayPair(
  fixtures: Fixture[],
  dateIso: string,
  homeAbbr: string,
  awayAbbr: string
): Fixture | null {
  const key = dayPairKey(dateIso, homeAbbr, awayAbbr);
  return fixtures.find((f) => dayPairKey(f.date, f.home.abbreviation, f.away.abbreviation) === key) ?? null;
}

function currentGoals(scores: SmScore[] | undefined, side: 'home' | 'away'): string {
  return scoreFor(scores, side) ?? '0';
}

function isFinishedState(state?: { short_name?: string; state?: string; developer_name?: string; name?: string }): boolean {
  const s = `${state?.developer_name ?? ''} ${state?.short_name ?? ''} ${state?.state ?? ''} ${state?.name ?? ''}`.toUpperCase();
  return s.includes('FT') || s.includes('FULL') || s.includes('FINISHED') || s.includes('AET') || s.includes('PEN');
}

function meetingFromSm(f: SmFixture): HeadToHeadMeeting | null {
  const parts = f.participants ?? [];
  const homeP = parts.find((p) => participantSide(p) === 'home') ?? parts[0];
  const awayP = parts.find((p) => participantSide(p) === 'away') ?? parts[1];
  if (!homeP || !awayP || !isFinishedState(f.state)) return null;
  return {
    id: String(f.id),
    date: f.starting_at ? `${f.starting_at.replace(' ', 'T')}Z` : '',
    homeAbbr: scheduleAbbr(homeP.short_code ?? 'LOC'),
    awayAbbr: scheduleAbbr(awayP.short_code ?? 'VIS'),
    homeName: homeP.name,
    awayName: awayP.name,
    homeScore: currentGoals(f.scores, 'home'),
    awayScore: currentGoals(f.scores, 'away'),
  };
}

async function fetchHeadToHead(homeId: string, awayId: string): Promise<HeadToHeadSummary | null> {
  try {
    const leagueId = ligaMxLeagueId();
    const data = await smFetch<{ data?: SmFixture[] }>(
      `/fixtures/head-to-head/${homeId}/${awayId}`,
      {
        include: 'participants;scores;state;league',
        per_page: '25',
      }
    );
    const raw = data.data ?? [];
    const ligaRaw = raw.filter((f) => !f.league?.id || f.league.id === leagueId);
    const meetings = (ligaRaw.length ? ligaRaw : raw)
      .map(meetingFromSm)
      .filter((m): m is HeadToHeadMeeting => Boolean(m))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 6);

    if (!meetings.length) return null;

    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    for (const m of meetings) {
      const hs = Number(m.homeScore);
      const as = Number(m.awayScore);
      // Wins from perspective of current fixture's home/away clubs (by abbr match later in UI).
      // Here we store raw home/away of each historical meeting; summary counts for current pair computed in enrich.
      if (hs === as) draws += 1;
      else if (hs > as) homeWins += 1;
      else awayWins += 1;
    }

    return {
      played: meetings.length,
      homeWins,
      draws,
      awayWins,
      meetings,
    };
  } catch {
    return null;
  }
}

/** Recount H2H wins for the current fixture's home/away clubs (not historical home side). */
function recountH2hForPair(
  summary: HeadToHeadSummary | null,
  homeAbbr: string,
  awayAbbr: string
): HeadToHeadSummary | null {
  if (!summary) return null;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  for (const m of summary.meetings) {
    const hs = Number(m.homeScore);
    const as = Number(m.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) {
      draws += 1;
      continue;
    }
    const winnerAbbr = hs > as ? m.homeAbbr : m.awayAbbr;
    if (winnerAbbr === homeAbbr) homeWins += 1;
    else if (winnerAbbr === awayAbbr) awayWins += 1;
    else draws += 1;
  }
  return { ...summary, homeWins, draws, awayWins, played: summary.meetings.length };
}

async function fetchTeamForm(teamId: string, limit = 5): Promise<FormMatch[]> {
  try {
    const leagueId = ligaMxLeagueId();
    const data = await smFetch<{ data?: { latest?: SmFixture[] } }>(`/teams/${teamId}`, {
      include: 'latest.participants;latest.scores;latest.state;latest.league',
    });
    const latest = data.data?.latest ?? [];
    // Prefer Liga MX; fall back to any finished if SM omits league on latest.
    const finished = latest
      .filter((f) => isFinishedState(f.state))
      .sort((a, b) => +new Date(b.starting_at ?? 0) - +new Date(a.starting_at ?? 0));
    const ligaOnly = finished.filter((f) => f.league?.id === leagueId);
    const pool = (ligaOnly.length > 0 ? ligaOnly : finished).slice(0, limit);

    return pool.map((f) => {
      const parts = f.participants ?? [];
      const homeP = parts.find((p) => participantSide(p) === 'home') ?? parts[0];
      const awayP = parts.find((p) => participantSide(p) === 'away') ?? parts[1];
      const playedHome = String(homeP?.id) === teamId;
      const hs = Number(currentGoals(f.scores, 'home'));
      const as = Number(currentGoals(f.scores, 'away'));
      let result: FormResult = 'D';
      if (Number.isFinite(hs) && Number.isFinite(as) && hs !== as) {
        const won = playedHome ? hs > as : as > hs;
        result = won ? 'W' : 'L';
      }
      const opp = playedHome ? awayP : homeP;
      return {
        id: String(f.id),
        date: f.starting_at ? `${f.starting_at.replace(' ', 'T')}Z` : '',
        opponentAbbr: scheduleAbbr(opp?.short_code ?? 'RIV'),
        opponentName: opp?.name ?? 'Rival',
        homeScore: currentGoals(f.scores, 'home'),
        awayScore: currentGoals(f.scores, 'away'),
        playedHome,
        result,
      };
    });
  } catch {
    return [];
  }
}

export async function fetchMatchSnapshot(fixtureId: string): Promise<MatchSnapshot | null> {
  const include =
    'participants;scores;state;venue;round;events.type;comments;statistics.type;lineups.type;lineups.player;referees.referee;formations';
  try {
    const data = await smFetch<{ data?: SmFixture }>(`/fixtures/${fixtureId}`, { include });
    if (!data.data) return null;
    const base = mapFixture(data.data);
    const events = mapEvents(
      data.data.events,
      base.home.id,
      base.away.id,
      base.home.abbreviation,
      base.away.abbreviation
    );

    const [homeForm, awayForm, h2hRaw] = await Promise.all([
      fetchTeamForm(base.home.id, 5),
      fetchTeamForm(base.away.id, 5),
      fetchHeadToHead(base.home.id, base.away.id),
    ]);

    return {
      ...base,
      scorers: scorersFromEvents(events),
      events,
      comments: mapComments(data.data.comments),
      stats: mapStatistics(data.data.statistics),
      referee: mapReferee(data.data.referees),
      lineups: mapLineups(
        data.data.lineups,
        data.data.formations,
        base.home.id,
        base.away.id,
        base.home.name,
        base.away.name,
        base.home.abbreviation,
        base.away.abbreviation
      ),
      form: { home: homeForm, away: awayForm },
      headToHead: recountH2hForPair(h2hRaw, base.home.abbreviation, base.away.abbreviation),
    };
  } catch {
    return null;
  }
}

export type SmStandingEntry = {
  position: number;
  team: { id: string; name: string; abbreviation: string; logo?: string };
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: string;
  pts: number;
};

function detailValue(
  details: { value?: number; type?: { developer_name?: string; code?: string } }[] | undefined,
  keys: string[]
): number {
  for (const d of details ?? []) {
    const name = (d.type?.developer_name ?? d.type?.code ?? '').toUpperCase();
    if (keys.includes(name)) return Number(d.value ?? 0);
  }
  return 0;
}

export async function fetchLigaMxStandings(): Promise<{
  season: string;
  entries: SmStandingEntry[];
}> {
  const cached = getCache<{ season: string; entries: SmStandingEntry[] }>(
    STANDINGS_CACHE_KEY,
    STANDINGS_TTL_MS
  );
  if (cached) return cached;

  const data = await smFetch<{
    data?: {
      position?: number;
      points?: number;
      participant?: {
        id?: number;
        name?: string;
        short_code?: string;
        image_path?: string;
      };
      details?: { value?: number; type?: { developer_name?: string; code?: string } }[];
    }[];
  }>(`/standings/seasons/${ligaMxSeasonId()}`, {
    include: 'participant;details.type',
  });

  const entries: SmStandingEntry[] = (data.data ?? [])
    .map((row) => {
      const gp = detailValue(row.details, ['OVERALL_MATCHES']);
      const w = detailValue(row.details, ['OVERALL_WINS']);
      const d = detailValue(row.details, ['OVERALL_DRAWS']);
      const l = detailValue(row.details, ['OVERALL_LOST']);
      const gf = detailValue(row.details, ['OVERALL_SCORED']);
      const ga = detailValue(row.details, ['OVERALL_CONCEDED']);
      const gd = detailValue(row.details, ['OVERALL_GOAL_DIFFERENCE']);
      const pts = detailValue(row.details, ['TOTAL_POINTS']) || Number(row.points ?? 0);
      return {
        position: Number(row.position ?? 0),
        team: {
          id: String(row.participant?.id ?? ''),
          name: row.participant?.name ?? '',
          abbreviation: scheduleAbbr(row.participant?.short_code ?? ''),
          logo: row.participant?.image_path,
        },
        gp,
        w,
        d,
        l,
        gf,
        ga,
        gd: String(gd),
        pts,
      };
    })
    .sort((a, b) => a.position - b.position);

  const table = { season: 'Apertura 2026', entries };
  setCache(STANDINGS_CACHE_KEY, table);
  return table;
}
