import { espnFetch, summaryUrl, SLUG } from '@/lib/espn';
import { attachDondeVer } from '@/config/dondeVer';
import type { MatchSnapshot } from './types';
import { fetchMatchSnapshot, sportmonksEnabled } from './sportmonks';

type LeagueKey = 'liga-mx' | 'mundial' | 'seleccion';

function espnSlug(league: LeagueKey) {
  return league === 'liga-mx' ? SLUG.LIGA_MX : SLUG.WORLD_CUP;
}

function normalizeLeague(league: string): LeagueKey {
  if (league === 'liga-mx') return 'liga-mx';
  if (league === 'seleccion') return 'seleccion';
  return 'mundial';
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
      boxscore?: {
        teams?: {
          statistics?: {
            label?: string;
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

    const stats =
      raw.boxscore?.teams?.[0]?.statistics?.map((s) => ({
        label: s.label ?? '',
        home: String(s.homeValue ?? s.home ?? ''),
        away: String(s.awayValue ?? s.away ?? ''),
      })) ?? [];

    const fixture = attachDondeVer({
      id,
      provider: 'espn',
      league: league === 'liga-mx' ? 'liga-mx' : league === 'seleccion' ? 'seleccion' : 'other',
      date: comp?.date ?? new Date().toISOString(),
      state,
      statusLabel: status?.type?.shortDetail || status?.type?.description || '',
      clock: status?.displayClock,
      venue: comp?.venue?.fullName ?? null,
      city: comp?.venue?.address?.city ?? null,
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

    return { ...fixture, events: plays, comments: [], stats };
  } catch {
    return null;
  }
}

export async function getMatch(league: string, id: string): Promise<MatchSnapshot | null> {
  const key = normalizeLeague(league);

  if (key === 'liga-mx' && sportmonksEnabled()) {
    try {
      const sm = await fetchMatchSnapshot(id);
      if (sm) return attachDondeVer(sm) as MatchSnapshot;
    } catch {
      /* fall through */
    }
  }

  return fromEspn(key, id);
}
