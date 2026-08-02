import { espnFetch, scoreboardUrl, SLUG } from '@/lib/espn';
import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';
import { mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture, FixtureScorer, MatchState } from './types';

const DATE_RANGE = '20260701-20261231';

/** Legacy aliases → current ESPN / schedule codes (Apertura 2026). */
const ESPN_ABBR: Record<string, string> = {
  NEC: 'NCX',
  PUM: 'UNAM',
  TIG: 'UANL',
  SLP: 'ASL',
  ALT: 'ATL', // old static Atlante code
  CHI: 'GDL',
};

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
    statusLabel:
      event.status?.type?.shortDetail ||
      event.status?.type?.description ||
      (state === 'in' ? 'EN VIVO' : state === 'post' ? 'Final' : 'Próximo'),
    clock: event.status?.displayClock,
    venue: comp?.venue?.fullName ?? null,
    city: comp?.venue?.address?.city ?? null,
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

function espnAbbr(abbr: string): string {
  return ESPN_ABBR[abbr] ?? abbr;
}

function dayPairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  return `${mexicoDayKey(new Date(dateIso))}|${homeAbbr}|${awayAbbr}`;
}

function mapStatic(): Fixture[] {
  return APERTURA_2026_FIXTURES.map((f) => ({
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
      id: f.home.abbreviation,
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score,
    },
    away: {
      id: f.away.abbreviation,
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
function mergeEspnOntoStatic(espn: Fixture[]): Fixture[] {
  const byKey = new Map(
    espn.map((f) => [
      dayPairKey(f.date, espnAbbr(f.home.abbreviation), espnAbbr(f.away.abbreviation)),
      f,
    ])
  );
  const used = new Set<string>();

  const merged = mapStatic().map((s) => {
    const key = dayPairKey(s.date, s.home.abbreviation, s.away.abbreviation);
    const live = byKey.get(key);
    if (!live) return s;
    used.add(key);
    return {
      ...s,
      id: live.id,
      date: live.date,
      state: live.state,
      statusLabel: live.statusLabel,
      clock: live.clock,
      venue: live.venue ?? s.venue,
      city: live.city ?? s.city,
      winnerSide: live.winnerSide,
      scorers: live.scorers,
      home: {
        ...s.home,
        id: live.home.id,
        logo: live.home.logo,
        score: live.home.score,
      },
      away: {
        ...s.away,
        id: live.away.id,
        logo: live.away.logo,
        score: live.away.score,
      },
    };
  });

  // Keep ESPN-only events (e.g. midweek cups) without inventing a jornada
  for (const f of espn) {
    const key = dayPairKey(f.date, espnAbbr(f.home.abbreviation), espnAbbr(f.away.abbreviation));
    if (!used.has(key)) merged.push(f);
  }

  return merged;
}

export async function fetchEspnLigaMxFixtures(): Promise<{ fixtures: Fixture[]; source: 'espn' | 'static' }> {
  try {
    const raw = (await espnFetch(scoreboardUrl(SLUG.LIGA_MX, DATE_RANGE))) as { events?: EventRaw[] };
    const espn = (raw.events ?? []).map(mapEvent);
    if (espn.length === 0) return { fixtures: mapStatic(), source: 'static' };
    return { fixtures: mergeEspnOntoStatic(espn), source: 'espn' };
  } catch {
    return { fixtures: mapStatic(), source: 'static' };
  }
}
