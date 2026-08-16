import { NextResponse } from 'next/server';
import { getGamesOfDay } from '@/lib/sports/gamesOfDay';
import { getJornadaOverview } from '@/lib/sports/jornada';
import { getPulse } from '@/lib/sports/pulse';
import type { Fixture } from '@/lib/sports/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Drift detector. All Liga MX surfaces derive from one shared board, so any two
 * feeds must agree on a fixture's score + state. This endpoint fetches jornada,
 * games-of-day and pulse and reports every fixture id whose score/state differs
 * across surfaces. `ok: true` means no drift. (Clock is excluded — it can lag a
 * single poll without being a real mismatch.)
 */
type Snap = { matchup: string; score: string; state: string; clock: string };

function snap(f: Fixture): Snap {
  return {
    matchup: `${f.home.abbreviation}-${f.away.abbreviation}`,
    score: `${f.home.score ?? '-'}-${f.away.score ?? '-'}`,
    state: f.state,
    clock: f.clock ?? '',
  };
}

export async function GET() {
  const [j, g, p] = await Promise.all([
    getJornadaOverview().catch(() => null),
    getGamesOfDay().catch(() => null),
    getPulse().catch(() => null),
  ]);

  const surfaces: Record<string, Fixture[]> = {
    jornada: j ? [...j.live, ...j.played, ...j.upcoming] : [],
    games: g ? g.games : [],
    pulse: p ? [...p.live, ...p.upcoming, ...p.recent] : [],
  };

  const byId = new Map<string, Record<string, Snap>>();
  for (const [name, rows] of Object.entries(surfaces)) {
    for (const f of rows) {
      const rec = byId.get(f.id) ?? {};
      rec[name] = snap(f);
      byId.set(f.id, rec);
    }
  }

  const conflicts: { id: string; matchup: string; values: Record<string, Snap> }[] = [];
  let overlap = 0;
  for (const [id, rec] of byId) {
    const names = Object.keys(rec);
    if (names.length < 2) continue;
    overlap += 1;
    const key = (s: Snap) => `${s.score}|${s.state}`;
    const distinct = new Set(names.map((n) => key(rec[n]!)));
    if (distinct.size > 1) {
      conflicts.push({ id, matchup: rec[names[0]!]!.matchup, values: rec });
    }
  }

  return NextResponse.json(
    {
      ok: conflicts.length === 0,
      checkedAt: new Date().toISOString(),
      counts: Object.fromEntries(
        Object.entries(surfaces).map(([k, v]) => [k, v.length])
      ),
      overlap,
      conflicts,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
