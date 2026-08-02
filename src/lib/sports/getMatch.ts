import { espnFetch, summaryUrl, SLUG } from '@/lib/espn';
import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';
import { attachDondeVer } from '@/config/dondeVer';
import { localizeCity, localizeStatus, localizeVenue } from './localizeEs';
import type { CommentaryLine, MatchSnapshot } from './types';
import {
  fetchLigaMxSeasonFixtures,
  fetchMatchSnapshot,
  findFixtureByDayPair,
  sportmonksEnabled,
} from './sportmonks';

type LeagueKey = 'liga-mx' | 'mundial' | 'seleccion';

function espnSlug(league: LeagueKey) {
  return league === 'liga-mx' ? SLUG.LIGA_MX : SLUG.WORLD_CUP;
}

function normalizeLeague(league: string): LeagueKey {
  if (league === 'liga-mx') return 'liga-mx';
  if (league === 'seleccion') return 'seleccion';
  return 'mundial';
}

/** ESPN soccer event ids are typically 401…; Sportmonks Liga MX fixtures are ~19…. */
function looksLikeEspnEventId(id: string): boolean {
  return /^401\d{6,}$/.test(id);
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
async function resolveSportmonksFixtureId(id: string): Promise<string | null> {
  const season = await fetchLigaMxSeasonFixtures();
  if (season.some((f) => f.id === id)) return id;

  const staticHit = APERTURA_2026_FIXTURES.find((f) => f.id === id);
  if (staticHit) {
    const byDay = findFixtureByDayPair(
      season,
      staticHit.date,
      staticHit.home.abbreviation,
      staticHit.away.abbreviation
    );
    if (byDay) return byDay.id;

    // Date may have moved — match jornada + pair
    const j = staticHit.jornada?.match(/(\d+)/)?.[1];
    if (j) {
      const hit = season.find(
        (f) =>
          f.jornada?.includes(j) &&
          f.home.abbreviation === staticHit.home.abbreviation &&
          f.away.abbreviation === staticHit.away.abbreviation
      );
      if (hit) return hit.id;
    }
  }

  if (!looksLikeEspnEventId(id)) return null;

  // ID bridge only — not used as content provider.
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
    const home = comp?.competitors?.find((c) => c.homeAway === 'home') ?? comp?.competitors?.[0];
    const away = comp?.competitors?.find((c) => c.homeAway === 'away') ?? comp?.competitors?.[1];
    if (comp?.date && home?.team?.abbreviation && away?.team?.abbreviation) {
      const hit = findFixtureByDayPair(
        season,
        comp.date,
        home.team.abbreviation,
        away.team.abbreviation
      );
      if (hit) return hit.id;
    }
  } catch {
    /* ignore */
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
        const clock = c.time?.displayValue?.trim();
        return {
          id: String(c.sequence ?? i),
          minute: parseClockMinute(clock),
          order: c.sequence ?? i,
          text,
          isGoal: /\b(goal|gol)\b/i.test(text),
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

export async function getMatch(league: string, id: string): Promise<MatchSnapshot | null> {
  const key = normalizeLeague(league);

  // Liga MX: Sportmonks only while the token is present. ESPN is last-resort
  // when the API is unavailable (no token / SM hard-fail with no snapshot).
  if (key === 'liga-mx' && sportmonksEnabled()) {
    try {
      let fixtureId = id;
      if (looksLikeEspnEventId(id) || id.startsWith('static-')) {
        const resolved = await resolveSportmonksFixtureId(id);
        if (resolved) fixtureId = resolved;
      }

      let sm = await fetchMatchSnapshot(fixtureId);
      if (!sm && fixtureId !== id) sm = await fetchMatchSnapshot(id);
      if (!sm) {
        const resolved = await resolveSportmonksFixtureId(id);
        if (resolved) sm = await fetchMatchSnapshot(resolved);
      }
      if (sm) return attachDondeVer(sm) as MatchSnapshot;
      // Token present but fixture missing — do not serve ESPN match content.
      return null;
    } catch {
      // Sportmonks API unavailable → fall through to ESPN.
    }
  }

  return fromEspn(key, id);
}
