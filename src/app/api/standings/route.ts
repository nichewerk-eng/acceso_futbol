import { NextResponse } from 'next/server';
import { espnFetch, standingsUrl, SLUG } from '@/lib/espn';
import { getCache, setCache } from '@/lib/apiCache';

const CACHE_KEY = 'wc-standings';
const TTL_MS    = 30_000;

export async function GET() {
  const cached = getCache<ReturnType<typeof parseGroups>>(CACHE_KEY, TTL_MS);
  if (cached) {
    return NextResponse.json({ groups: cached }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  try {
    const raw = await espnFetch(standingsUrl(SLUG.WORLD_CUP)) as { children?: GroupRaw[] };
    const groups = parseGroups(raw);
    setCache(CACHE_KEY, groups);
    return NextResponse.json({ groups }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch {
    // Serve stale cache on error rather than failing
    const stale = getCache<ReturnType<typeof parseGroups>>(CACHE_KEY, Infinity);
    if (stale) return NextResponse.json({ groups: stale, stale: true }, { status: 200 });
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}

function parseGroups(raw: { children?: GroupRaw[] }) {
  return (raw.children ?? []).map((group) => ({
    name: group.name,
    abbreviation: group.abbreviation,
    entries: (group.standings?.entries ?? [])
      .map((entry) => {
        const sm = Object.fromEntries(entry.stats.map((s) => [s.abbreviation, s]));
        return {
          position: Number(sm['R']?.value ?? 0),
          team: { id: entry.team.id, name: entry.team.displayName, abbreviation: entry.team.abbreviation },
          note: entry.note ?? null,
          gp:  Number(sm['GP']?.value ?? 0),
          w:   Number(sm['W']?.value  ?? 0),
          d:   Number(sm['D']?.value  ?? 0),
          l:   Number(sm['L']?.value  ?? 0),
          gf:  Number(sm['F']?.value  ?? 0),
          ga:  Number(sm['A']?.value  ?? 0),
          gd:  sm['GD']?.displayValue ?? '0',
          pts: Number(sm['P']?.value  ?? 0),
        };
      })
      .sort((a, b) => a.position - b.position),
  }));
}

interface StatRaw    { abbreviation: string; value: number; displayValue: string }
interface EntryRaw   { team: { id: string; displayName: string; abbreviation: string }; note?: { color: string; description: string; rank: number }; stats: StatRaw[] }
interface GroupRaw   { name: string; abbreviation: string; standings?: { entries?: EntryRaw[] } }
