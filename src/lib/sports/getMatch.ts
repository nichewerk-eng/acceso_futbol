import { cache } from 'react';
import { espnFetch, summaryUrl, SLUG } from '@/lib/espn';
import { peekCache } from '@/lib/apiCache';
import {
  getCurrentJornada,
} from '@/fixtures/ligamx-apertura-2026';
import { findAperturaFixture, resolveAperturaSmFixtureId } from './aperturaSmMap';
import { attachDondeVer } from '@/config/dondeVer';
import { smTeamIdFromAbbr } from './ligaMxTeams';
import { mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { enrichMatchWithEspnCommentary } from './espnCommentary';
import { FRESH, isNearKickoff, looksStillLive } from './freshness';
import { applyLeaguesCupOfficial } from './leaguesCupBoard';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import {
  fetchFixturesByDate,
  fetchLigaMxSeasonFixtures,
  fetchMatchContexto,
  fetchMatchSnapshot,
  fetchMatchTick,
  findFixtureByDayPair,
  ligaMxLeagueId,
  ligaMxFemenilLeagueId,
  livingRoomLeagueIds,
  sportmonksEnabled,
} from './sportmonks';
import type {
  CommentaryLine,
  FormMatch,
  HeadToHeadSummary,
  MatchSnapshot,
} from './types';

type LeagueKey = 'liga-mx' | 'liga-mx-femenil' | 'mundial' | 'seleccion' | 'leagues-cup';

/** Shared with `/api/sports/match` + radio so both surfaces coalesce. */
export function sportsMatchCacheKey(league: string, id: string) {
  return `sports-match-v15-lc-board-${league}-${id}`;
}

export function sportsMatchTickCacheKey(league: string, id: string) {
  return `sports-match-tick-v2-${league}-${id}`;
}

export function sportsMatchContextoCacheKey(league: string, id: string) {
  return `sports-match-contexto-v1-${league}-${id}`;
}

export type MatchContexto = {
  form: { home: FormMatch[]; away: FormMatch[] };
  headToHead: HeadToHeadSummary | null;
};

/** Warm snapshot from memory — never hits Sportmonks. */
export function peekMatch(league: string, id: string): MatchSnapshot | null {
  return (
    peekCache<MatchSnapshot>(sportsMatchCacheKey(league, id)) ??
    peekCache<MatchSnapshot>(sportsMatchTickCacheKey(league, id))
  );
}

function espnSlug(league: LeagueKey) {
  return league === 'liga-mx' ? SLUG.LIGA_MX : SLUG.WORLD_CUP;
}

function normalizeLeague(league: string): LeagueKey {
  if (league === 'liga-mx') return 'liga-mx';
  if (league === 'liga-mx-femenil') return 'liga-mx-femenil';
  if (league === 'seleccion') return 'seleccion';
  if (league === 'leagues-cup') return 'leagues-cup';
  return 'mundial';
}

/** ESPN soccer event ids are typically 401…; Sportmonks Liga MX fixtures are ~19…. */
function looksLikeEspnEventId(id: string): boolean {
  return /^401\d{6,}$/.test(id);
}

function looksLikeSmFixtureId(id: string): boolean {
  return /^\d{6,}$/.test(id) && !looksLikeEspnEventId(id);
}

function parseClockMinute(display?: string): number | undefined {
  if (!display) return undefined;
  const m = display.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Resolve legacy ESPN / static calendar ids → Sportmonks fixture id.
 * When Sportmonks is on, we only peek ESPN summary for id-bridging (date + abbrs),
 * never as the match data source.
 */
async function resolveFromDateWindow(
  dateIso: string,
  homeAbbr: string,
  awayAbbr: string
): Promise<string | null> {
  const dayKey = mexicoDayKey(new Date(dateIso));
  const dated = (
    await Promise.all(
      [dayKey, shiftDayKey(dayKey, 1)].map((k) =>
        fetchFixturesByDate(k, [ligaMxLeagueId()])
      )
    )
  ).flat();
  return findFixtureByDayPair(dated, dateIso, homeAbbr, awayAbbr)?.id ?? null;
}

async function resolveSportmonksFixtureId(id: string): Promise<string | null> {
  if (looksLikeSmFixtureId(id)) return id;

  const fromIndex = resolveAperturaSmFixtureId(id);
  if (fromIndex) return fromIndex;

  const staticHit = findAperturaFixture(id);
  if (staticHit) {
    const fromWindow = await resolveFromDateWindow(
      staticHit.date,
      staticHit.home.abbreviation,
      staticHit.away.abbreviation
    );
    if (fromWindow) return fromWindow;
  }

  let espnPair: { date: string; home: string; away: string } | null = null;
  if (looksLikeEspnEventId(id)) {
    try {
      const raw = (await espnFetch(summaryUrl(SLUG.LIGA_MX, id))) as {
        header?: {
          competitions?: {
            date?: string;
            competitors?: {
              homeAway: string;
              team: { abbreviation: string };
            }[];
          }[];
        };
      };
      const comp = raw.header?.competitions?.[0];
      const home =
        comp?.competitors?.find((c) => c.homeAway === 'home') ?? comp?.competitors?.[0];
      const away =
        comp?.competitors?.find((c) => c.homeAway === 'away') ?? comp?.competitors?.[1];
      if (comp?.date && home?.team?.abbreviation && away?.team?.abbreviation) {
        espnPair = {
          date: comp.date,
          home: home.team.abbreviation,
          away: away.team.abbreviation,
        };
        const fromWindow = await resolveFromDateWindow(
          espnPair.date,
          espnPair.home,
          espnPair.away
        );
        if (fromWindow) return fromWindow;
      }
    } catch {
      /* ignore */
    }
  }

  const season = await fetchLigaMxSeasonFixtures();
  if (season.some((f) => f.id === id)) return id;

  const pair = staticHit
    ? {
        date: staticHit.date,
        home: staticHit.home.abbreviation,
        away: staticHit.away.abbreviation,
      }
    : espnPair;
  if (pair) {
    const byDay = findFixtureByDayPair(season, pair.date, pair.home, pair.away);
    if (byDay) return byDay.id;
  }

  const j = staticHit?.jornada?.match(/(\d+)/)?.[1];
  if (j && staticHit) {
    const hit = season.find(
      (f) =>
        f.jornada?.includes(j) &&
        f.home.abbreviation === staticHit.home.abbreviation &&
        f.away.abbreviation === staticHit.away.abbreviation
    );
    if (hit) return hit.id;
  }

  return null;
}

async function fromEspn(league: LeagueKey, id: string): Promise<MatchSnapshot | null> {
  try {
    const raw = (await espnFetch(summaryUrl(espnSlug(league), id))) as {
      header?: {
        competitions?: {
          date?: string;
          competitors?: {
            homeAway: string;
            score?: string;
            team: { id?: string; displayName: string; abbreviation: string; logos?: { href: string }[] };
          }[];
          status?: { displayClock?: string; type?: { state?: string; shortDetail?: string; description?: string } };
          venue?: { fullName?: string; address?: { city?: string } };
        }[];
      };
      keyPlays?: {
        id?: string | number;
        period?: { number?: number };
        clock?: { displayValue?: string };
        text?: string;
        type?: { text?: string };
        team?: { abbreviation?: string };
      }[];
      plays?: {
        id?: string | number;
        period?: { number?: number };
        clock?: { displayValue?: string };
        text?: string;
        type?: { text?: string };
        team?: { abbreviation?: string };
      }[];
      commentary?: {
        sequence?: number;
        time?: { value?: number; displayValue?: string };
        text?: string;
      }[];
      boxscore?: {
        teams?: {
          homeAway?: 'home' | 'away';
          team?: { abbreviation?: string };
          statistics?: {
            name?: string;
            label?: string;
            displayValue?: string;
            homeValue?: string | number;
            awayValue?: string | number;
            home?: string;
            away?: string;
          }[];
        }[];
      };
    };

    const comp = raw.header?.competitions?.[0];
    const home = comp?.competitors?.find((c) => c.homeAway === 'home') ?? comp?.competitors?.[0];
    const away = comp?.competitors?.find((c) => c.homeAway === 'away') ?? comp?.competitors?.[1];
    const status = comp?.status;
    const stateRaw = status?.type?.state ?? 'pre';
    const state = stateRaw === 'in' ? 'in' : stateRaw === 'post' ? 'post' : 'pre';

    const plays = (raw.keyPlays ?? raw.plays ?? []).slice(0, 50).map((p, i) => ({
      id: String(p.id ?? i),
      period: p.period?.number ?? 0,
      clock: p.clock?.displayValue ?? '',
      type: p.type?.text ?? '',
      text: p.text ?? '',
      teamAbbr: p.team?.abbreviation,
    }));

    const comments: CommentaryLine[] = (raw.commentary ?? [])
      .map((c, i) => {
        const text = (c.text ?? '').trim();
        const clock = c.time?.displayValue?.trim() || undefined;
        return {
          id: String(c.sequence ?? i),
          minute: parseClockMinute(clock),
          clock,
          order: c.sequence ?? i,
          text,
          isGoal: /¡?go+l|\bgol\b|\bgoal\b/i.test(text),
        };
      })
      .filter((c) => c.text);

    const boxTeams = raw.boxscore?.teams ?? [];
    const homeBox = boxTeams.find((t) => t.homeAway === 'home') ?? boxTeams[0];
    const awayBox = boxTeams.find((t) => t.homeAway === 'away') ?? boxTeams[1];
    const homeStats = homeBox?.statistics ?? [];
    const awayByKey = new Map(
      (awayBox?.statistics ?? []).map((s) => [s.name || s.label || '', s])
    );
    const stats = homeStats
      .map((s) => {
        const key = s.name || s.label || '';
        const a = awayByKey.get(key);
        const homeVal = s.displayValue ?? s.homeValue ?? s.home ?? '';
        const awayVal = a?.displayValue ?? s.awayValue ?? s.away ?? a?.homeValue ?? '';
        return {
          label: s.label || s.name || key,
          home: String(homeVal),
          away: String(awayVal),
        };
      })
      .filter((s) => s.label);

    const fixture = attachDondeVer({
      id,
      provider: 'espn',
      league: league === 'liga-mx' ? 'liga-mx' : league === 'seleccion' ? 'seleccion' : 'other',
      date: comp?.date ?? new Date().toISOString(),
      state,
      statusLabel: localizeStatus(
        status?.type?.shortDetail || status?.type?.description || null,
        state
      ),
      clock: status?.displayClock,
      venue: localizeVenue(comp?.venue?.fullName),
      city: localizeCity(comp?.venue?.address?.city),
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
    });

    return { ...fixture, events: plays, comments, stats };
  } catch {
    return null;
  }
}

async function getMatchUncached(league: string, id: string): Promise<MatchSnapshot | null> {
  const key = normalizeLeague(league);

  // Liga MX / Femenil / Leagues Cup: Sportmonks while the token is present.
  if (
    (key === 'liga-mx' || key === 'liga-mx-femenil' || key === 'leagues-cup') &&
    sportmonksEnabled()
  ) {
    try {
      let fixtureId = id;
      if (key === 'liga-mx' && (looksLikeEspnEventId(id) || id.startsWith('static-'))) {
        const resolved = await resolveSportmonksFixtureId(id);
        if (resolved) fixtureId = resolved;
      }

      let sm = await fetchMatchSnapshot(fixtureId);
      if (!sm && fixtureId !== id) sm = await fetchMatchSnapshot(id);
      if (
        !sm &&
        key === 'liga-mx' &&
        (looksLikeEspnEventId(id) || id.startsWith('static-'))
      ) {
        const resolved = await resolveSportmonksFixtureId(id);
        if (resolved) sm = await fetchMatchSnapshot(resolved);
      }
      if (sm) {
        // SM scores/lineups; Completa uses ESPN Spanish PBP (budgeted so live isn't stalled).
        let enriched =
          key === 'liga-mx' ? await enrichMatchWithEspnCommentary(sm) : sm;
        if (key === 'leagues-cup') {
          const board = applyLeaguesCupOfficial(enriched);
          enriched = {
            ...enriched,
            ...board,
            // Keep snapshot extras; only override board fields (venue/date/sides).
            home: { ...enriched.home, ...board.home },
            away: { ...enriched.away, ...board.away },
          };
        }
        return attachDondeVer(enriched) as MatchSnapshot;
      }
      // Token present but fixture missing — do not serve ESPN match content.
      return null;
    } catch {
      // Sportmonks API unavailable → fall through to ESPN (Liga MX only).
    }
  }

  if (key === 'leagues-cup' || key === 'liga-mx-femenil') return null;
  return fromEspn(key, id);
}

async function getMatchTickUncached(
  league: string,
  id: string
): Promise<MatchSnapshot | null> {
  const key = normalizeLeague(league);
  if (
    (key !== 'liga-mx' && key !== 'liga-mx-femenil' && key !== 'leagues-cup') ||
    !sportmonksEnabled()
  ) {
    return getMatchUncached(league, id);
  }

  try {
    let fixtureId = id;
    if (key === 'liga-mx' && (looksLikeEspnEventId(id) || id.startsWith('static-'))) {
      const resolved = await resolveSportmonksFixtureId(id);
      if (resolved) fixtureId = resolved;
    }

    const dateLeagueIds =
      key === 'liga-mx-femenil' ? [ligaMxFemenilLeagueId()] : livingRoomLeagueIds();
    const dated =
      (await fixtureFromDateBoards(fixtureId, dateLeagueIds)) ??
      (fixtureId !== id ? await fixtureFromDateBoards(id, dateLeagueIds) : null);

    // Date boards are a long-TTL schedule dump — they often stay `pre` after
    // kickoff. Only skip the fixture GET for a match that cannot be live yet.
    const datedIsQuietPre =
      dated?.state === 'pre' &&
      !isNearKickoff(dated.date, Date.now(), dated.state) &&
      !looksStillLive(dated);

    let sm = datedIsQuietPre
      ? dated
      : (await fetchMatchTick(fixtureId)) ??
        (fixtureId !== id ? await fetchMatchTick(id) : null) ??
        dated;
    if (!sm) return null;

    if (key === 'leagues-cup') {
      const board = applyLeaguesCupOfficial(sm);
      sm = {
        ...sm,
        ...board,
        home: { ...sm.home, ...board.home },
        away: { ...sm.away, ...board.away },
      };
    }
    if (key === 'liga-mx' && sm.state === 'in') {
      sm = await enrichMatchWithEspnCommentary(sm, {
        budgetMs: FRESH.espnEnrichBudgetMs,
      });
    }
    return attachDondeVer(sm) as MatchSnapshot;
  } catch {
    return null;
  }
}

/** Deduped per request (metadata + page share one fetch). */
export const getMatch = cache(getMatchUncached);
/** Lean live tick (scores/clock/events). */
export const getMatchTick = cache(getMatchTickUncached);

async function fixtureFromDateBoards(
  id: string,
  leagueIds: number[] = livingRoomLeagueIds()
): Promise<MatchSnapshot | null> {
  const dayKey = mexicoDayKey();
  const keys = [dayKey, shiftDayKey(dayKey, 1), shiftDayKey(dayKey, 2)];
  try {
    const boards = await Promise.all(
      keys.map((k) => fetchFixturesByDate(k, leagueIds))
    );
    const hit = boards.flat().find((f) => f.id === id);
    if (!hit) return null;
    return { ...attachDondeVer(hit), events: [], comments: [] } as MatchSnapshot;
  } catch {
    return null;
  }
}

async function getMatchContextoUncached(
  league: string,
  id: string
): Promise<MatchContexto | null> {
  const key = normalizeLeague(league);
  if (key !== 'liga-mx-femenil') {
    const indexed = findAperturaFixture(id);
    const homeId = indexed ? smTeamIdFromAbbr(indexed.home.abbreviation) : null;
    const awayId = indexed ? smTeamIdFromAbbr(indexed.away.abbreviation) : null;
    if (indexed && homeId && awayId) {
      const live =
        peekMatch(league, indexed.id)?.state === 'in' ||
        peekMatch(league, id)?.state === 'in';
      return fetchMatchContexto(
        homeId,
        awayId,
        indexed.home.abbreviation,
        indexed.away.abbreviation,
        live
      );
    }
  }

  const dateLeagueIds =
    key === 'liga-mx-femenil' ? [ligaMxFemenilLeagueId()] : livingRoomLeagueIds();
  const snap =
    peekMatch(league, id) ??
    (await fixtureFromDateBoards(id, dateLeagueIds)) ??
    (await getMatchTickUncached(league, id));
  if (!snap) return null;
  if (snap.home.id === 'home' || snap.away.id === 'away') return null;
  return fetchMatchContexto(
    snap.home.id,
    snap.away.id,
    snap.home.abbreviation,
    snap.away.abbreviation,
    snap.state === 'in'
  );
}

/** Warm form/H2H for the current jornada — fire-and-forget, coalesced by singleFlight. */
export function prefetchCurrentJornadaContexto(
  fixtures: { id: string; date: string; jornada: string | null; status: { state: string } }[]
): void {
  if (fixtures.length === 0) return;
  const n = getCurrentJornada(fixtures);
  const rows = fixtures.filter((f) => {
    const j = Number(f.jornada?.match(/(\d+)/)?.[1]);
    return j === n && f.status.state !== 'in';
  });
  void Promise.allSettled(
    rows.slice(0, 9).map((f) => getMatchContextoUncached('liga-mx', f.id))
  );
}

/** Form + H2H — independent of the fat match-detail include. */
export const getMatchContexto = cache(getMatchContextoUncached);
