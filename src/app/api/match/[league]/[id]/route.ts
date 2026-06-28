import { NextResponse } from 'next/server';
import { espnFetch, summaryUrl, SLUG } from '@/lib/espn';
import { getCache, setCache } from '@/lib/apiCache';

const SLUG_MAP: Record<string, string> = {
  mundial: SLUG.WORLD_CUP,
  'liga-mx': SLUG.LIGA_MX,
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ league: string; id: string }> }
) {
  const { league, id } = await params;
  const slug = SLUG_MAP[league];
  if (!slug) return NextResponse.json({ error: 'invalid_league' }, { status: 400 });

  const CACHE_KEY = `match-${league}-${id}`;
  const TTL_MS    = 15_000;

  const cached = getCache<MatchSummary>(CACHE_KEY, TTL_MS);
  if (cached) return NextResponse.json(cached);

  try {
    const raw = await espnFetch(summaryUrl(slug, id)) as RawSummary;
    const summary = parseSummary(raw, id, league);
    setCache(CACHE_KEY, summary);
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}

export interface MatchTeamStat { name: string; displayValue: string; home: string; away: string }
export interface MatchPlayer { jersey: string; name: string; position: string; starter: boolean }
export interface MatchEvent { period: number; clock: string; text: string; type: string; teamAbbr: string }

export interface MatchSummary {
  id: string; league: string;
  header: {
    name: string; date: string;
    home: { name: string; abbreviation: string; score: string | null; logo?: string };
    away: { name: string; abbreviation: string; score: string | null; logo?: string };
    status: { state: string; description: string; shortDetail: string; displayClock: string };
    venue: string | null; city: string | null;
  };
  stats: MatchTeamStat[];
  rosters: { home: MatchPlayer[]; away: MatchPlayer[] };
  plays: MatchEvent[];
}

function parseSummary(raw: RawSummary, id: string, league: string): MatchSummary {
  const comp    = raw.header?.competitions?.[0];
  const home    = comp?.competitors?.find((c) => c.homeAway === 'home') ?? comp?.competitors?.[0];
  const away    = comp?.competitors?.find((c) => c.homeAway === 'away') ?? comp?.competitors?.[1];
  const status  = comp?.status ?? raw.header?.status;
  const venueRaw = comp?.venue;

  // Stats (boxscore)
  const stats: MatchTeamStat[] = (raw.boxscore?.teams ?? []).flatMap((t) =>
    (t.statistics ?? []).map((s) => ({
      name: s.label ?? s.name ?? '',
      displayValue: s.displayValue ?? '',
      home: String(s.homeValue ?? s.home ?? ''),
      away: String(s.awayValue ?? s.away ?? ''),
    }))
  ).filter((v, i, a) => a.findIndex((x) => x.name === v.name) === i); // unique by name

  // Rosters
  const parseRoster = (teamRoster: RawRosterTeam | undefined): MatchPlayer[] =>
    (teamRoster?.athletes ?? []).map((a) => ({
      jersey:   a.jersey ?? '',
      name:     a.athlete?.displayName ?? a.displayName ?? '',
      position: a.athlete?.position?.abbreviation ?? a.position?.abbreviation ?? '',
      starter:  a.starter ?? false,
    }));

  const homeRoster = raw.rosters?.find((r) => r.homeAway === 'home');
  const awayRoster = raw.rosters?.find((r) => r.homeAway === 'away');

  // Key plays
  const plays: MatchEvent[] = (raw.keyPlays ?? raw.plays ?? [])
    .slice(0, 50)
    .map((p) => ({
      period:   p.period?.number ?? 0,
      clock:    p.clock?.displayValue ?? '',
      text:     p.text ?? '',
      type:     p.type?.text ?? '',
      teamAbbr: p.team?.abbreviation ?? '',
    }));

  return {
    id, league,
    header: {
      name: raw.header?.competitions?.[0]?.neutralSite ? '' : '',
      date: comp?.date ?? '',
      home: { name: home?.team?.displayName ?? '', abbreviation: home?.team?.abbreviation ?? '', score: home?.score ?? null, logo: home?.team?.logos?.[0]?.href },
      away: { name: away?.team?.displayName ?? '', abbreviation: away?.team?.abbreviation ?? '', score: away?.score ?? null, logo: away?.team?.logos?.[0]?.href },
      status: { state: status?.type?.state ?? 'pre', description: status?.type?.description ?? '', shortDetail: status?.type?.shortDetail ?? '', displayClock: status?.displayClock ?? '' },
      venue: venueRaw?.fullName ?? null,
      city:  venueRaw?.address?.city ?? null,
    },
    stats,
    rosters: { home: parseRoster(homeRoster), away: parseRoster(awayRoster) },
    plays,
  };
}

// Raw ESPN summary types (simplified)
interface RawTeamComp { homeAway: 'home' | 'away'; score?: string; team: { displayName: string; abbreviation: string; logos?: { href: string }[] }; }
interface RawStatus { displayClock?: string; type?: { state?: string; description?: string; shortDetail?: string } }
interface RawComp { date?: string; homeAway?: string; competitors?: RawTeamComp[]; status?: RawStatus; venue?: { fullName?: string; address?: { city?: string } }; neutralSite?: boolean }
interface RawSummary {
  header?: { competitions?: RawComp[]; status?: RawStatus };
  boxscore?: { teams?: { homeAway: string; statistics?: { label?: string; name?: string; displayValue?: string; homeValue?: string | number; awayValue?: string | number; home?: string; away?: string }[] }[] };
  rosters?: (RawRosterTeam & { homeAway: string })[];
  keyPlays?: RawPlay[];
  plays?: RawPlay[];
}
interface RawRosterTeam { homeAway?: string; athletes?: { jersey?: string; starter?: boolean; displayName?: string; position?: { abbreviation?: string }; athlete?: { displayName?: string; position?: { abbreviation?: string } } }[] }
interface RawPlay { period?: { number?: number }; clock?: { displayValue?: string }; text?: string; type?: { text?: string }; team?: { abbreviation?: string } }
