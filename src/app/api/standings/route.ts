import { NextResponse } from 'next/server';

const ESPN_STANDINGS_URL =
  'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';

export const revalidate = 60;

export async function GET() {
  try {
    const res = await fetch(ESPN_STANDINGS_URL, {
      next: { revalidate: 60 },
      headers: { 'User-Agent': 'AccesoFutbol/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    }

    const raw = await res.json();

    const groups = (raw.children ?? []).map((group: GroupRaw) => ({
      name: group.name,
      abbreviation: group.abbreviation,
      entries: (group.standings?.entries ?? [])
        .map((entry: EntryRaw) => {
          const sm = Object.fromEntries(
            entry.stats.map((s) => [s.abbreviation, s]),
          );
          return {
            position: Number(sm['R']?.value ?? 0),
            team: {
              id: entry.team.id,
              name: entry.team.displayName,
              abbreviation: entry.team.abbreviation,
            },
            note: entry.note ?? null,
            gp: Number(sm['GP']?.value ?? 0),
            w: Number(sm['W']?.value ?? 0),
            d: Number(sm['D']?.value ?? 0),
            l: Number(sm['L']?.value ?? 0),
            gf: Number(sm['F']?.value ?? 0),
            ga: Number(sm['A']?.value ?? 0),
            gd: sm['GD']?.displayValue ?? '0',
            pts: Number(sm['P']?.value ?? 0),
          };
        })
        .sort(
          (a: { position: number }, b: { position: number }) =>
            a.position - b.position,
        ),
    }));

    return NextResponse.json(
      { groups },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      },
    );
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

// ── Internal raw types ────────────────────────────────────────────────────────

interface StatRaw {
  abbreviation: string;
  value: number;
  displayValue: string;
}

interface EntryRaw {
  team: { id: string; displayName: string; abbreviation: string };
  note?: { color: string; description: string; rank: number };
  stats: StatRaw[];
}

interface GroupRaw {
  name: string;
  abbreviation: string;
  standings?: { entries?: EntryRaw[] };
}
