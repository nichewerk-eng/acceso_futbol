import type { CommentaryLine, Fixture, LiveEvent, MatchSnapshot, MatchState } from './types';

const BASE = 'https://api.sportmonks.com/v3/football';
const TIMEOUT_MS = 10_000;

/** Override via env after confirming IDs in MySportmonks. */
export function ligaMxLeagueId(): number {
  const n = Number(process.env.SPORTMONKS_LIGA_MX_ID ?? '743');
  return Number.isFinite(n) ? n : 743;
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
  minute?: number;
  extra_minute?: number | null;
  result?: string | null;
  player_name?: string | null;
  related_player_name?: string | null;
  section?: string | null;
  participant_id?: number;
}

interface SmComment {
  id: number;
  order?: number;
  minute?: number | null;
  comment?: string;
  is_goal?: boolean;
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
  if (bySide.length) {
    const g = bySide[bySide.length - 1]?.score?.goals;
    return g !== undefined && g !== null ? String(g) : null;
  }
  const current =
    scores.find((x) => (x.description ?? '').toLowerCase() === 'current') ??
    scores[scores.length - 1];
  const goals = current?.score?.goals;
  return goals !== undefined && goals !== null ? String(goals) : null;
}

function participantSide(p: SmParticipant): 'home' | 'away' {
  return p.meta?.location === 'away' ? 'away' : 'home';
}

export function mapFixture(f: SmFixture): Fixture {
  const parts = f.participants ?? [];
  const homeP = parts.find((p) => participantSide(p) === 'home') ?? parts[0];
  const awayP = parts.find((p) => participantSide(p) === 'away') ?? parts[1];
  const state = mapState(f.state?.state ?? f.state?.short_name ?? f.state?.name);

  const homeScore =
    parts.length && f.scores
      ? (() => {
          const row = f.scores.find(
            (s) => s.score?.participant === String(homeP?.id) || s.score?.participant === 'home'
          );
          return row?.score?.goals !== undefined ? String(row.score.goals) : scoreFor(f.scores, 'home');
        })()
      : null;
  const awayScore =
    parts.length && f.scores
      ? (() => {
          const row = f.scores.find(
            (s) => s.score?.participant === String(awayP?.id) || s.score?.participant === 'away'
          );
          return row?.score?.goals !== undefined ? String(row.score.goals) : scoreFor(f.scores, 'away');
        })()
      : null;

  return {
    id: String(f.id),
    provider: 'sportmonks',
    league: 'liga-mx',
    date: f.starting_at ? `${f.starting_at.replace(' ', 'T')}Z` : new Date().toISOString(),
    jornada: f.round?.name ?? null,
    state,
    statusLabel: f.state?.name ?? f.state?.short_name ?? (state === 'in' ? 'EN VIVO' : state === 'post' ? 'Final' : 'Próximo'),
    venue: f.venue?.name ?? null,
    city: f.venue?.city_name ?? null,
    home: {
      id: String(homeP?.id ?? 'home'),
      name: homeP?.name ?? 'Local',
      abbreviation: homeP?.short_code ?? 'LOC',
      logo: homeP?.image_path,
      score: state === 'pre' ? null : homeScore,
    },
    away: {
      id: String(awayP?.id ?? 'away'),
      name: awayP?.name ?? 'Visitante',
      abbreviation: awayP?.short_code ?? 'VIS',
      logo: awayP?.image_path,
      score: state === 'pre' ? null : awayScore,
    },
  };
}

function mapEvents(events: SmEvent[] | undefined): LiveEvent[] {
  return (events ?? []).slice(0, 40).map((e) => ({
    id: String(e.id),
    period: e.section === '2nd' ? 2 : 1,
    clock: e.minute !== undefined ? `${e.minute}${e.extra_minute ? `+${e.extra_minute}` : ''}'` : '',
    minute: e.minute,
    type: e.info ?? e.result ?? 'Event',
    text: [e.player_name, e.info ?? e.result].filter(Boolean).join(' — ') || 'Jugada',
    playerName: e.player_name ?? undefined,
  }));
}

function mapComments(comments: SmComment[] | undefined): CommentaryLine[] {
  return (comments ?? []).slice(0, 40).map((c) => ({
    id: String(c.id),
    minute: c.minute ?? undefined,
    order: c.order,
    text: c.comment ?? '',
    isGoal: Boolean(c.is_goal),
  }));
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

export async function fetchMatchSnapshot(fixtureId: string): Promise<MatchSnapshot | null> {
  const include = 'participants;scores;state;venue;round;events;comments;statistics';
  const data = await smFetch<{ data?: SmFixture }>(`/fixtures/${fixtureId}`, { include });
  if (!data.data) return null;
  const base = mapFixture(data.data);
  return {
    ...base,
    events: mapEvents(data.data.events),
    comments: mapComments(data.data.comments),
  };
}
