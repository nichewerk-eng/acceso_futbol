import { NextResponse } from 'next/server';
import { espnFetch, standingsUrl, SLUG } from '@/lib/espn';
import { getCache, setCache } from '@/lib/apiCache';

const CACHE_KEY = 'ligamx-standings';
const TTL_MS    = 60_000;

export async function GET() {
  const cached = getCache<LigaMXTable>(CACHE_KEY, TTL_MS);
  if (cached) return NextResponse.json(cached, { headers: ccHeaders });

  try {
    const raw = await espnFetch(standingsUrl(SLUG.LIGA_MX)) as RawRoot;
    const table = parseTable(raw);
    setCache(CACHE_KEY, table);
    return NextResponse.json(table, { headers: ccHeaders });
  } catch {
    const stale = getCache<LigaMXTable>(CACHE_KEY, Infinity);
    if (stale) return NextResponse.json({ ...stale, stale: true });
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}

const ccHeaders = { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' };

export interface LigaMXEntry {
  position: number;
  team: { id: string; name: string; abbreviation: string; logo?: string };
  gp: number; w: number; d: number; l: number; gf: number; ga: number; gd: string; pts: number;
}

export interface LigaMXTable {
  season: string;
  entries: LigaMXEntry[];
}

function parseTable(raw: RawRoot): LigaMXTable {
  // The standings API may return a single group or nested children.
  const season = raw.season?.displayName ?? raw.name ?? 'Apertura 2026';
  const sourceEntries: EntryRaw[] = (() => {
    // Flat standings
    if (raw.standings?.entries) return raw.standings.entries;
    // Nested children (e.g., single group)
    if (raw.children?.[0]?.standings?.entries) return raw.children[0].standings.entries;
    return [];
  })();

  const entries: LigaMXEntry[] = sourceEntries.map((entry) => {
    const sm = Object.fromEntries(entry.stats.map((s) => [s.abbreviation, s]));
    return {
      position: Number(sm['R']?.value ?? sm['POS']?.value ?? 0),
      team: {
        id:           entry.team.id,
        name:         entry.team.displayName,
        abbreviation: entry.team.abbreviation,
        logo:         entry.team.logos?.[0]?.href,
      },
      gp:  Number(sm['GP']?.value ?? 0),
      w:   Number(sm['W']?.value  ?? 0),
      d:   Number(sm['D']?.value  ?? 0),
      l:   Number(sm['L']?.value  ?? 0),
      gf:  Number(sm['F']?.value  ?? sm['GF']?.value ?? 0),
      ga:  Number(sm['A']?.value  ?? sm['GA']?.value ?? 0),
      gd:  sm['GD']?.displayValue ?? '0',
      pts: Number(sm['P']?.value  ?? sm['PTS']?.value ?? 0),
    };
  }).sort((a, b) => a.position - b.position);

  return { season, entries };
}

// Raw ESPN types
interface StatRaw  { abbreviation: string; value: number; displayValue: string }
interface EntryRaw { team: { id: string; displayName: string; abbreviation: string; logos?: { href: string }[] }; stats: StatRaw[] }
interface StandingsBlock { entries?: EntryRaw[] }
interface ChildRaw { standings?: StandingsBlock }
interface RawRoot  { name?: string; season?: { displayName?: string }; standings?: StandingsBlock; children?: ChildRaw[] }
