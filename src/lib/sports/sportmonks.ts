/** Sportmonks fixtures, livescores, and match snapshots. */
import { getCache, peekCacheAgeMs, setCache, singleFlight } from '@/lib/apiCache';
import { FRESH } from './freshness';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import {
  femenilTeamAbbr,
  femenilTeamName,
  splitFemenilStandings,
  type FemenilStandingGroup,
} from './ligaMxFemenil';
import { localizeComment, commentLooksLikeGoal } from './localizeComment';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import { smFetch } from './sm/client';
import { LANE } from './sm/lanes';
import { ensureSmRefs, matchStateFromBlob, matchStateFromId } from './sm/refs';
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

const SEASON_CACHE_KEY = 'sm-ligamx-season-fixtures-v6-states';
const FEM_SEASON_CACHE_KEY = 'sm-ligamx-femenil-season-fixtures-v1-states';
const LC_SEASON_CACHE_KEY = 'sm-leagues-cup-season-fixtures-v3-states';
const LIVE_CACHE_KEY = 'sm-livescores-v9-events-player';
/** Hot-path livescores: type_id locally; player names so goleo can overlay live goals. */
const LIVESCORES_INCLUDE = 'participants;scores;state;periods;events;events.player';
/** Lean in-play tick — state so true HT stamps Descanso; periods win while the clock still ticks. */
const MATCH_TICK_INCLUDE = 'participants;scores;state;periods;events;events.player';
/** Full match chapter (lineups, stats, comments). */
const MATCH_DETAIL_INCLUDE =
  'participants;scores;state;venue;round;league;periods;events.type;events.player;comments;statistics.type;lineups.type;lineups.player;referees.referee;formations';
/** Sticky in-play board while /livescores/latest returns empty (no updates in ~10s). */
const LIVE_STICKY_TTL_MS = 120_000;
const DATE_CACHE_PREFIX = 'sm-fixtures-date-v5-ht-clock';
const SEASON_TTL_MS = LANE.catalog.memTtlMs;
const LIVE_TTL_MS = LANE.live.memTtlMs;
const DATE_TTL_MS = LANE.board.memTtlMs;
const STANDINGS_CACHE_KEY = 'sm-ligamx-standings-v1';
const FEM_STANDINGS_CACHE_KEY = 'sm-ligamx-femenil-standings-v2-groups';
const STANDINGS_TTL_MS = FRESH.standingsTtlMs;
const FORM_TTL_MS = 30 * 60_000;
const H2H_TTL_MS = 30 * 60_000;

/** Sportmonks Liga MX league id (Mexico · domestic). */
export function ligaMxLeagueId(): number {
  return 743;
}

/** Apertura 2026 / season 2026-2027. */
export function ligaMxSeasonId(): number {
  return 28009;
}

/** Sportmonks Liga MX Femenil (Liga Mx Women). */
export function ligaMxFemenilLeagueId(): number {
  return 1579;
}

/** Liga MX Femenil Apertura 2026 / season 2026-2027. */
export function ligaMxFemenilSeasonId(): number {
  return 28036;
}

/** Sportmonks Leagues Cup league id (MLS × Liga MX). */
export function leaguesCupLeagueId(): number {
  return 3211;
}

/** Leagues Cup 2026 season. */
export function leaguesCupSeasonId(): number {
  return 27500;
}

/** Living-room boards: domestic Liga MX + Leagues Cup. */
export function livingRoomLeagueIds(): number[] {
  return [ligaMxLeagueId(), leaguesCupLeagueId()];
}

function mapLeagueId(leagueId?: number | null): Fixture['league'] {
  if (leagueId === leaguesCupLeagueId()) return 'leagues-cup';
  if (leagueId === ligaMxFemenilLeagueId()) return 'liga-mx-femenil';
  if (leagueId === ligaMxLeagueId()) return 'liga-mx';
  return 'liga-mx';
}

/** Drop Sportmonks placeholder silhouettes. */
function playerPhoto(path?: string | null): string | undefined {
  if (!path || /placeholder/i.test(path)) return undefined;
  return path;
}

export function sportmonksEnabled(): boolean {
  return Boolean(process.env.SPORTMONKS_API_TOKEN?.trim());
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
  player?: {
    display_name?: string;
    name?: string;
    common_name?: string;
    image_path?: string;
  };
}

interface SmComment {
  id: number;
  order?: number;
  minute?: number | null;
  extra_minute?: number | null;
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
  player?: {
    display_name?: string;
    name?: string;
    common_name?: string;
    image_path?: string;
  };
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

interface SmPeriod {
  id?: number;
  description?: string | null;
  ticking?: boolean;
  sort_order?: number;
  counts_from?: number | null;
  period_length?: number | null;
  minutes?: number | null;
  seconds?: number | null;
  time_added?: number | null;
  has_timer?: boolean;
}

interface SmFixture {
  id: number;
  starting_at?: string;
  starting_at_timestamp?: number;
  name?: string;
  result_info?: string | null;
  state_id?: number;
  league_id?: number;
  state?: {
    id?: number;
    state?: string;
    short_name?: string;
    name?: string;
    developer_name?: string;
  };
  participants?: SmParticipant[];
  scores?: SmScore[];
  events?: SmEvent[];
  comments?: SmComment[];
  statistics?: SmStatistic[];
  lineups?: SmLineup[];
  referees?: SmRefereeRow[];
  formations?: SmFormation[];
  periods?: SmPeriod[];
  venue?: { name?: string; city_name?: string };
  round?: { name?: string };
  league?: { id?: number; name?: string };
}

function stateBlob(f: SmFixture): string {
  const s = f.state;
  return `${s?.developer_name ?? ''} ${s?.state ?? ''} ${s?.short_name ?? ''} ${s?.name ?? ''}`.toUpperCase();
}

function mapState(raw?: string, stateId?: number | null): MatchState {
  const fromBlob = matchStateFromBlob(raw);
  const fromId = matchStateFromId(stateId);
  // Name/clock blobs like "2nd Half" / "2º tiempo" win over a stale or legacy FT id.
  if (fromBlob === 'in') return 'in';
  if (fromId) return fromId;
  return fromBlob;
}

function coerceInPlayState(f: SmFixture, state: MatchState): MatchState {
  if (state === 'in') return 'in';
  if (f.periods?.some((p) => p.ticking)) return 'in';
  return state;
}

function periodClock(p: SmPeriod): string | undefined {
  if (p.minutes == null || !Number.isFinite(p.minutes)) return undefined;
  const mins = Math.max(0, Math.floor(p.minutes));
  const from = p.counts_from ?? 0;
  const length = p.period_length ?? 45;
  const regulationEnd = from + length;
  if (mins > regulationEnd) return `${regulationEnd}+${mins - regulationEnd}'`;
  const desc = (p.description ?? '').toLowerCase();
  if (desc.includes('extra') || desc.includes('et')) return `ET ${mins}'`;
  return `${mins}'`;
}

/** Live board stamp: 67' · 45+2' · HT · ET · PEN */
function clockFromFixture(f: SmFixture, state: MatchState): string | undefined {
  const blob = stateBlob(f);
  const periods = f.periods ?? [];
  const tickingPeriod = periods.find((p) => p.ticking);

  // SM often labels 1st-half added time as HT while the period is still ticking.
  // The match chapter used to omit `state` and looked live; the board froze on HT.
  if (tickingPeriod) {
    const liveClock = periodClock(tickingPeriod);
    if (liveClock) return liveClock;
  } else if (/\bHT\b|HALF[\s_-]?TIME|DESCANSO/.test(blob)) {
    return 'HT';
  }

  if (/\bPEN|PENALT/.test(blob) && state === 'in') return 'PEN';

  const latestPeriod = [...periods].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))[0];
  if (latestPeriod) {
    const fromPeriod = periodClock(latestPeriod);
    if (fromPeriod) return fromPeriod;
  }

  if (/\bET\b|EXTRA|AET/.test(blob) && state === 'in') return 'ET';

  // Fallback: latest event minute
  const lastEvent = [...(f.events ?? [])]
    .filter((e) => e.minute != null)
    .sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0) || (b.extra_minute ?? 0) - (a.extra_minute ?? 0))[0];
  if (lastEvent?.minute != null) {
    return lastEvent.extra_minute
      ? `${lastEvent.minute}+${lastEvent.extra_minute}'`
      : `${lastEvent.minute}'`;
  }

  return undefined;
}

/** Don't stamp Descanso while a period clock is still running. */
function statusLabelFor(f: SmFixture, state: MatchState): string {
  const ticking = f.periods?.find((p) => p.ticking);
  if (ticking) {
    const desc = ticking.description?.trim();
    if (desc) return localizeStatus(desc, 'in');
    return localizeStatus(null, 'in');
  }
  return localizeStatus(
    f.state?.name ?? f.state?.short_name ?? f.state?.developer_name ?? null,
    state
  );
}

/** Overlay fresh livescores onto a season/schedule board by fixture id. */
export function overlayLiveFixtures(base: Fixture[], live: Fixture[]): Fixture[] {
  if (!live.length) return base;
  const byId = new Map(live.map((f) => [f.id, f]));
  const seen = new Set<string>();
  const merged = base.map((f) => {
    const l =
      byId.get(f.id) ??
      live.find(
        (x) =>
          dayPairKey(x.date, x.home.abbreviation, x.away.abbreviation) ===
          dayPairKey(f.date, f.home.abbreviation, f.away.abbreviation)
      );
    if (!l) return f;
    seen.add(l.id);
    return {
      ...f,
      id: l.id,
      provider: l.provider,
      state: l.state,
      statusLabel: l.statusLabel,
      clock: l.clock ?? f.clock,
      winnerSide: l.winnerSide ?? f.winnerSide,
      scorers: l.scorers ?? f.scorers,
      assists: l.assists ?? f.assists,
      home: {
        ...f.home,
        id: l.home.id,
        score: l.home.score,
        logo: l.home.logo ?? f.home.logo,
      },
      away: {
        ...f.away,
        id: l.away.id,
        score: l.away.score,
        logo: l.away.logo ?? f.away.logo,
      },
    };
  });
  // Include in-play games missing from the season board (edge cases).
  for (const l of live) {
    if (!seen.has(l.id) && l.state === 'in') merged.push(l);
  }
  return merged;
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

function winnerSideOf(
  homeP: SmParticipant | undefined,
  awayP: SmParticipant | undefined,
  state: MatchState,
  homeScore: string | null,
  awayScore: string | null
): 'home' | 'away' | null {
  if (state !== 'post' && state !== 'in') return null;
  if (homeP?.meta?.winner === true) return 'home';
  if (awayP?.meta?.winner === true) return 'away';
  if (homeP?.meta?.winner === false && awayP?.meta?.winner === false) return null;
  const hs = Number(homeScore);
  const as = Number(awayScore);
  if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) return null;
  return hs > as ? 'home' : 'away';
}

function leaguesCupPhaseLabel(dateIso: string): string {
  const day = dateIso.slice(0, 10);
  if (day >= '2026-08-04' && day <= '2026-08-13') return 'Fase 1';
  if (day >= '2026-08-25' && day <= '2026-09-06') return 'Eliminación';
  return 'Leagues Cup';
}

export function mapFixture(f: SmFixture): Fixture {
  const parts = f.participants ?? [];
  const homeP = parts.find((p) => participantSide(p) === 'home') ?? parts[0];
  const awayP = parts.find((p) => participantSide(p) === 'away') ?? parts[1];
  const state = coerceInPlayState(f, mapState(stateBlob(f), f.state_id ?? f.state?.id));

  const homeScore = scoreFor(f.scores, 'home');
  const awayScore = scoreFor(f.scores, 'away');
  const homeId = String(homeP?.id ?? 'home');
  const awayId = String(awayP?.id ?? 'away');
  const league = mapLeagueId(f.league?.id ?? f.league_id);
  // Sportmonks Chicago Fire short_code is CHI; scheduleAbbr(CHI)→GDL is ESPN Chivas only.
  const rawHome = (homeP?.short_code ?? 'LOC').toUpperCase();
  const rawAway = (awayP?.short_code ?? 'VIS').toUpperCase();
  const homeAbbr =
    league === 'liga-mx-femenil'
      ? femenilTeamAbbr(homeP?.short_code, homeP?.name)
      : league === 'leagues-cup' && rawHome === 'CHI'
        ? 'CHI'
        : scheduleAbbr(rawHome);
  const awayAbbr =
    league === 'liga-mx-femenil'
      ? femenilTeamAbbr(awayP?.short_code, awayP?.name)
      : league === 'leagues-cup' && rawAway === 'CHI'
        ? 'CHI'
        : scheduleAbbr(rawAway);
  const homeName =
    league === 'liga-mx-femenil' ? femenilTeamName(homeP?.name ?? 'Local') : (homeP?.name ?? 'Local');
  const awayName =
    league === 'liga-mx-femenil'
      ? femenilTeamName(awayP?.name ?? 'Visitante')
      : (awayP?.name ?? 'Visitante');
  const date = f.starting_at ? `${f.starting_at.replace(' ', 'T')}Z` : new Date().toISOString();
  const clock = clockFromFixture(f, state);

  const roundName = f.round?.name?.trim();
  let jornada: string | null = null;
  if (league === 'leagues-cup') {
    jornada = roundName && !/^jornada/i.test(roundName) ? roundName : leaguesCupPhaseLabel(date);
  } else if (roundName) {
    jornada = /jornada/i.test(roundName) ? roundName : `Jornada ${roundName}`;
  }

  const events = mapEvents(f.events, homeId, awayId, homeAbbr, awayAbbr);
  const scorers = scorersFromEvents(events);
  const assists = assistsFromEvents(events);

  return {
    id: String(f.id),
    provider: 'sportmonks',
    league,
    date,
    jornada,
    state,
    statusLabel: statusLabelFor(f, state),
    clock,
    venue: localizeVenue(f.venue?.name),
    city: localizeCity(f.venue?.city_name),
    winnerSide: winnerSideOf(homeP, awayP, state, homeScore, awayScore),
    scorers: scorers.length ? scorers : undefined,
    assists: assists.length ? assists : undefined,
    home: {
      id: homeId,
      name: homeName,
      abbreviation: homeAbbr,
      logo: playerPhoto(homeP?.image_path),
      score: state === 'pre' ? null : homeScore,
    },
    away: {
      id: awayId,
      name: awayName,
      abbreviation: awayAbbr,
      logo: playerPhoto(awayP?.image_path),
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

/**
 * Sportmonks football event type_ids — used when `events.type` is omitted.
 * @see https://docs.sportmonks.com/v3/definitions/types/events
 */
const EVENT_KIND_BY_TYPE_ID: Record<number, LiveEventKind> = {
  10: 'var',
  14: 'goal',
  15: 'own_goal',
  16: 'penalty',
  18: 'sub',
  19: 'yellow',
  20: 'red',
  21: 'red', // yellowredcard — second yellow → red
};

function eventKind(dev?: string, code?: string, typeId?: number): LiveEventKind {
  if (typeId != null && EVENT_KIND_BY_TYPE_ID[typeId]) {
    return EVENT_KIND_BY_TYPE_ID[typeId];
  }
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
      const kind = eventKind(e.type?.developer_name, e.type?.code, e.type_id);
      const type = eventTypeLabel(kind, e.type?.name || e.info);
      const player = shortName(
        e.player_name || e.player?.display_name || e.player?.name || e.player?.common_name
      );
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
        playerPhoto: playerPhoto(e.player?.image_path),
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
      photo: e.playerPhoto,
    }));
}

function assistsFromEvents(events: LiveEvent[]): FixtureScorer[] {
  return events
    .filter(
      (e) =>
        (e.kind === 'goal' || e.kind === 'penalty') &&
        Boolean(e.relatedPlayerName?.trim())
    )
    .map((e) => ({
      name: e.relatedPlayerName!.trim(),
      minute: e.clock.replace(/'$/, ''),
      side: e.side === 'away' ? 'away' : 'home',
    }));
}

function mapComments(comments: SmComment[] | undefined): CommentaryLine[] {
  return (comments ?? [])
    .map((c) => {
      const raw = (c.comment ?? '').trim();
      const minute = c.minute ?? undefined;
      const extra = c.extra_minute;
      const clock =
        minute != null
          ? extra
            ? `${minute}+${extra}'`
            : `${minute}'`
          : undefined;
      return {
        id: String(c.id),
        minute,
        clock,
        order: c.order,
        text: localizeComment(raw),
        isGoal: commentLooksLikeGoal(raw, Boolean(c.is_goal)),
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
        photo: playerPhoto(l.player?.image_path),
        slot: l.formation_position ?? null,
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

/**
 * In-play updates for selected leagues.
 * Uses `/livescores/latest` (only fixtures touched in ~last 10s) per SM rate-limit docs.
 * Empty latest → keep sticky in-play board; cold miss → one full `/livescores` hydrate.
 */
export async function fetchLivescores(
  leagueIds: number[] = livingRoomLeagueIds()
): Promise<Fixture[]> {
  const key = `${LIVE_CACHE_KEY}-${leagueIds.slice().sort().join(',')}`;
  const stickyKey = `${key}-sticky`;
  return singleFlight(key, LIVE_TTL_MS, async () => {
    const include = LIVESCORES_INCLUDE;
    const filters = `fixtureLeagues:${leagueIds.join(',')}`;
    ensureSmRefs();
    const latest = await smFetch<{ data?: SmFixture[] }>(
      '/livescores/latest',
      { include, filters },
      'live'
    );
    const fresh = (latest.data ?? []).map(mapFixture);
    const prev = getCache<Fixture[]>(stickyKey, LIVE_STICKY_TTL_MS) ?? [];
    const stickyAge = peekCacheAgeMs(stickyKey);
    const staleSticky =
      stickyAge != null && stickyAge >= FRESH.livescoresFullRefreshMs;

    // Cold start, or sticky board went quiet too long — full hydrate so scores don't freeze.
    if (fresh.length === 0 && (prev.length === 0 || staleSticky)) {
      const full = await smFetch<{ data?: SmFixture[] }>(
        '/livescores',
        { include, filters },
        'live'
      );
      const hydrated = (full.data ?? []).map(mapFixture).filter((f) => f.state === 'in');
      setCache(stickyKey, hydrated);
      return hydrated;
    }

    if (fresh.length === 0) {
      return prev.filter((f) => f.state === 'in');
    }

    const byId = new Map(prev.map((f) => [f.id, f]));
    for (const f of fresh) byId.set(f.id, f);
    const merged = [...byId.values()].filter((f) => f.state === 'in');
    setCache(stickyKey, merged);
    return merged;
  });
}

export async function fetchFixturesByDate(
  dateYYYYMMDD: string,
  leagueIds: number[] = [ligaMxLeagueId()]
): Promise<Fixture[]> {
  const key = `${DATE_CACHE_PREFIX}-${dateYYYYMMDD}-${leagueIds.slice().sort().join(',')}`;
  return singleFlight(key, DATE_TTL_MS, async () => {
    ensureSmRefs();
    const include = 'participants;scores;state;venue;round;league;periods';
    const data = await smFetch<{ data?: SmFixture[] }>(
      `/fixtures/date/${dateYYYYMMDD}`,
      {
        include,
        filters: `fixtureLeagues:${leagueIds.join(',')}`,
      },
      'board'
    );
    return (data.data ?? []).map(mapFixture);
  });
}

/** Full current Liga MX season (Apertura) via season include. */
export async function fetchLigaMxSeasonFixtures(): Promise<Fixture[]> {
  // singleFlight → shared via Upstash KV (L2) so every isolate sees one season dump.
  return singleFlight(SEASON_CACHE_KEY, SEASON_TTL_MS, async () => {
    const data = await smFetch<{ data?: { fixtures?: SmFixture[] } }>(
      `/seasons/${ligaMxSeasonId()}`,
      {
        include:
          'fixtures.participants;fixtures.scores;fixtures.state;fixtures.round;fixtures.venue;fixtures.events.type',
      },
      'catalog'
    );
    return (data.data?.fixtures ?? []).map(mapFixture);
  });
}

/** Full current Liga MX Femenil season via season include. */
export async function fetchLigaMxFemenilSeasonFixtures(): Promise<Fixture[]> {
  return singleFlight(FEM_SEASON_CACHE_KEY, SEASON_TTL_MS, async () => {
    const data = await smFetch<{ data?: { fixtures?: SmFixture[] } }>(
      `/seasons/${ligaMxFemenilSeasonId()}`,
      {
        include:
          'fixtures.participants;fixtures.scores;fixtures.state;fixtures.round;fixtures.venue;fixtures.league;fixtures.events.type',
      },
      'catalog'
    );
    return (data.data?.fixtures ?? []).map((f) =>
      mapFixture({
        ...f,
        league: f.league?.id
          ? f.league
          : { id: ligaMxFemenilLeagueId(), name: 'Liga MX Femenil' },
      })
    );
  });
}

/** Leagues Cup season — all fixtures; callers filter to MX-involved. */
export async function fetchLeaguesCupSeasonFixtures(): Promise<Fixture[]> {
  return singleFlight(LC_SEASON_CACHE_KEY, SEASON_TTL_MS, async () => {
    const data = await smFetch<{ data?: { fixtures?: SmFixture[] } }>(
      `/seasons/${leaguesCupSeasonId()}`,
      {
        include:
          'fixtures.participants;fixtures.scores;fixtures.state;fixtures.round;fixtures.venue;fixtures.league',
      },
      'catalog'
    );
    return (data.data?.fixtures ?? []).map((f) =>
      mapFixture({
        ...f,
        league: f.league?.id ? f.league : { id: leaguesCupLeagueId(), name: 'Leagues Cup' },
      })
    );
  });
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
  const blob = `${state?.developer_name ?? ''} ${state?.short_name ?? ''} ${state?.state ?? ''} ${state?.name ?? ''}`;
  return matchStateFromBlob(blob) === 'post';
}

function formKickAtMs(startingAt?: string | null): number {
  if (!startingAt) return 0;
  const iso = startingAt.includes('T') ? startingAt : startingAt.replace(' ', 'T');
  const t = +new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return Number.isFinite(t) ? t : 0;
}

/** Last N finished fixtures, every competition, newest first. */
export function selectLatestFinished<T extends {
  starting_at?: string | null;
  state?: { short_name?: string; state?: string; developer_name?: string; name?: string };
}>(latest: T[], limit: number): T[] {
  return latest
    .filter((f) => isFinishedState(f.state))
    .sort((a, b) => formKickAtMs(b.starting_at) - formKickAtMs(a.starting_at))
    .slice(0, limit);
}

/** Form row from this club's participant — not the fixture's listed home side. */
export function formMatchFromLatest(
  teamId: string,
  f: {
    id: string | number;
    starting_at?: string | null;
    participants?: SmParticipant[];
    scores?: SmScore[];
  }
): FormMatch | null {
  const parts = f.participants ?? [];
  const mine = parts.find((p) => String(p.id) === String(teamId));
  if (!mine) return null;
  const opp = parts.find((p) => String(p.id) !== String(teamId));
  const playedHome = participantSide(mine) === 'home';
  const hs = Number(currentGoals(f.scores, 'home'));
  const as = Number(currentGoals(f.scores, 'away'));
  let result: FormResult = 'D';
  if (Number.isFinite(hs) && Number.isFinite(as) && hs === as) {
    result = 'D';
  } else if (mine.meta?.winner === true) {
    result = 'W';
  } else if (mine.meta?.winner === false) {
    result = 'L';
  } else if (Number.isFinite(hs) && Number.isFinite(as)) {
    result = (playedHome ? hs > as : as > hs) ? 'W' : 'L';
  }
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
      },
      'catalog'
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

/** Last N finished matches for a club, every competition. */
export async function fetchClubForm(teamId: string, limit = 5): Promise<FormMatch[]> {
  return singleFlight(`sm-team-form-v3-all-${teamId}`, FORM_TTL_MS, () =>
    fetchTeamForm(teamId, limit)
  );
}

async function fetchTeamForm(teamId: string, limit = 5): Promise<FormMatch[]> {
  try {
    const data = await smFetch<{ data?: { latest?: SmFixture[] } }>(
      `/teams/${teamId}`,
      {
        include: 'latest.participants;latest.scores;latest.state;latest.league',
      },
      'catalog'
    );
    const pool = selectLatestFinished(data.data?.latest ?? [], limit);
    return pool
      .map((f) => formMatchFromLatest(teamId, f))
      .filter((row): row is FormMatch => row != null);
  } catch {
    return [];
  }
}

export async function fetchMatchSnapshot(fixtureId: string): Promise<MatchSnapshot | null> {
  const cacheKey = `sm-match-snap-v5-lanes-${fixtureId}`;
  return singleFlight(cacheKey, LANE.catalog.memTtlMs, () => loadMatchSnapshot(fixtureId));
}

/** Lean live tick — scores/clock/events only (no lineups/form/H2H). */
export async function fetchMatchTick(fixtureId: string): Promise<MatchSnapshot | null> {
  const cacheKey = `sm-match-tick-v3-ht-clock-${fixtureId}`;
  return singleFlight(cacheKey, LANE.live.memTtlMs, () => loadMatchTick(fixtureId));
}

async function loadMatchTick(fixtureId: string): Promise<MatchSnapshot | null> {
  try {
    ensureSmRefs();
    const data = await smFetch<{ data?: SmFixture }>(
      `/fixtures/${fixtureId}`,
      { include: MATCH_TICK_INCLUDE },
      'live'
    );
    if (!data.data) return null;
    const base = mapFixture(data.data);
    const events = mapEvents(
      data.data.events,
      base.home.id,
      base.away.id,
      base.home.abbreviation,
      base.away.abbreviation
    );
    return {
      ...base,
      scorers: scorersFromEvents(events),
      events,
      comments: [],
    };
  } catch {
    return null;
  }
}

async function loadContexto(
  homeId: string,
  awayId: string,
  homeAbbr: string,
  awayAbbr: string
): Promise<{
  form: { home: FormMatch[]; away: FormMatch[] };
  headToHead: HeadToHeadSummary | null;
}> {
  const h2hKey = `sm-h2h-v1-${[homeId, awayId].sort().join('-')}`;
  // Form is Team (own bucket); H2H is one Fixture call, coalesced 30 min.
  // Skipping this while live left Contexto empty on cold isolates.
  const [homeForm, awayForm, h2hRaw] = await Promise.all([
    fetchClubForm(homeId, 5),
    fetchClubForm(awayId, 5),
    singleFlight(h2hKey, H2H_TTL_MS, () => fetchHeadToHead(homeId, awayId)),
  ]);
  return {
    form: { home: homeForm, away: awayForm },
    headToHead: recountH2hForPair(h2hRaw, homeAbbr, awayAbbr),
  };
}

export async function fetchMatchContexto(
  homeId: string,
  awayId: string,
  homeAbbr: string,
  awayAbbr: string
) {
  return loadContexto(homeId, awayId, homeAbbr, awayAbbr);
}

async function loadMatchSnapshot(fixtureId: string): Promise<MatchSnapshot | null> {
  try {
    const data = await smFetch<{ data?: SmFixture }>(
      `/fixtures/${fixtureId}`,
      { include: MATCH_DETAIL_INCLUDE },
      'catalog'
    );
    if (!data.data) return null;
    const base = mapFixture(data.data);
    const events = mapEvents(
      data.data.events,
      base.home.id,
      base.away.id,
      base.home.abbreviation,
      base.away.abbreviation
    );

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
  return singleFlight(STANDINGS_CACHE_KEY, STANDINGS_TTL_MS, loadLigaMxStandings);
}

async function loadLigaMxStandings(): Promise<{
  season: string;
  entries: SmStandingEntry[];
}> {
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
  }, 'catalog');

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

  return { season: 'Apertura 2026', entries };
}

export async function fetchLigaMxFemenilStandings(): Promise<{
  season: string;
  entries: SmStandingEntry[];
  groups: FemenilStandingGroup<SmStandingEntry>[];
}> {
  return singleFlight(FEM_STANDINGS_CACHE_KEY, STANDINGS_TTL_MS, loadLigaMxFemenilStandings);
}

async function loadLigaMxFemenilStandings(): Promise<{
  season: string;
  entries: SmStandingEntry[];
  groups: FemenilStandingGroup<SmStandingEntry>[];
}> {
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
  }>(`/standings/seasons/${ligaMxFemenilSeasonId()}`, {
    include: 'participant;details.type',
  }, 'catalog');

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
      const rawName = row.participant?.name ?? '';
      return {
        position: Number(row.position ?? 0),
        team: {
          id: String(row.participant?.id ?? ''),
          name: femenilTeamName(rawName),
          abbreviation: femenilTeamAbbr(row.participant?.short_code, rawName),
          logo: playerPhoto(row.participant?.image_path),
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

  const groups = splitFemenilStandings(entries);
  return {
    season: 'Apertura 2026',
    entries: groups.flatMap((g) => g.entries),
    groups,
  };
}

const LC_STANDINGS_CACHE_KEY = 'sm-leagues-cup-standings-v1';

export type SmLcStandingGroup = {
  id: string;
  name: string;
  entries: SmStandingEntry[];
};

/** Sportmonks Fase 1 tables: Liga MX + MLS (top 4 each advance). */
export async function fetchLeaguesCupStandings(): Promise<{
  season: string;
  groups: SmLcStandingGroup[];
}> {
  return singleFlight(LC_STANDINGS_CACHE_KEY, STANDINGS_TTL_MS, loadLeaguesCupStandings);
}

async function loadLeaguesCupStandings(): Promise<{
  season: string;
  groups: SmLcStandingGroup[];
}> {
  const data = await smFetch<{
    data?: {
      position?: number;
      points?: number;
      group_id?: number;
      group?: { id?: number; name?: string };
      participant?: {
        id?: number;
        name?: string;
        short_code?: string;
        image_path?: string;
      };
      details?: { value?: number; type?: { developer_name?: string; code?: string } }[];
    }[];
  }>(`/standings/seasons/${leaguesCupSeasonId()}`, {
    include: 'participant;details.type;group',
  }, 'catalog');

  const byGroup = new Map<string, SmLcStandingGroup>();
  for (const row of data.data ?? []) {
    const gid = String(row.group_id ?? row.group?.id ?? 'unknown');
    const gname = row.group?.name ?? gid;
    if (!byGroup.has(gid)) {
      byGroup.set(gid, { id: gid, name: gname, entries: [] });
    }
    const gp = detailValue(row.details, ['OVERALL_MATCHES']);
    const w = detailValue(row.details, ['OVERALL_WINS']);
    const d = detailValue(row.details, ['OVERALL_DRAWS']);
    const l = detailValue(row.details, ['OVERALL_LOST']);
    const gf = detailValue(row.details, ['OVERALL_SCORED']);
    const ga = detailValue(row.details, ['OVERALL_CONCEDED']);
    const gd = detailValue(row.details, ['OVERALL_GOAL_DIFFERENCE']);
    const pts = detailValue(row.details, ['TOTAL_POINTS']) || Number(row.points ?? 0);
    byGroup.get(gid)!.entries.push({
      position: Number(row.position ?? 0),
      team: {
        id: String(row.participant?.id ?? ''),
        name: row.participant?.name ?? '',
        // Chicago Fire stays CHI (Liga MX legacy maps CHI→GDL).
        abbreviation: (() => {
          const raw = (row.participant?.short_code ?? '').trim().toUpperCase();
          if (raw === 'CHI') return 'CHI';
          return scheduleAbbr(raw);
        })(),
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
    });
  }

  for (const g of byGroup.values()) {
    g.entries.sort((a, b) => a.position - b.position);
  }

  // Prefer Liga MX first for Acceso.
  const groups = [...byGroup.values()].sort((a, b) => {
    const rank = (n: string) => (/liga\s*mx/i.test(n) ? 0 : /mls/i.test(n) ? 1 : 2);
    return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name);
  });

  return { season: 'Leagues Cup 2026', groups };
}

