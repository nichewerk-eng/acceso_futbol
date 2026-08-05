import { NextResponse } from 'next/server';
import { peekCache, singleFlight } from '@/lib/apiCache';
import { FRESH, standingsCacheHeaders } from '@/lib/sports/freshness';
import {
  buildLeaguesCupStandingsFromFixtures,
  type LcStandingsPayload,
} from '@/lib/sports/leaguesCupStandings';
import {
  fetchLeaguesCupLiveBoard,
  fetchLeaguesCupStandings,
  sportmonksEnabled,
} from '@/lib/sports';

const CACHE_KEY = 'leagues-cup-standings-v2-live-board';
const ccHeaders = standingsCacheHeaders();

export async function GET() {
  try {
    const table = await singleFlight(CACHE_KEY, FRESH.standingsTtlMs, async () => {
      // Prefer live board math (correct LC pen points) when Phase One has results.
      if (sportmonksEnabled()) {
        try {
          const { fixtures } = await fetchLeaguesCupLiveBoard();
          const fromBoard = buildLeaguesCupStandingsFromFixtures(fixtures);
          const played = [...fromBoard.ligaMx, ...fromBoard.mls].some((e) => e.gp > 0);
          if (played) return fromBoard;

          const sm = await fetchLeaguesCupStandings();
          const ligaMx = sm.groups.find((g) => /liga\s*mx/i.test(g.name));
          const mls = sm.groups.find((g) => /mls/i.test(g.name));
          if (ligaMx && mls) {
            const mapSm = (e: (typeof ligaMx.entries)[number], i: number) => ({
              position: e.position || i + 1,
              team: e.team,
              gp: e.gp,
              w: e.w,
              pw: 0,
              pl: 0,
              l: e.l,
              gf: e.gf,
              ga: e.ga,
              gd: Number(e.gd) || e.gf - e.ga,
              pts: e.pts,
              mark: (e.position || i + 1) <= 4 ? ('a' as const) : null,
            });
            return {
              season: sm.season,
              ligaMx: ligaMx.entries.map(mapSm),
              mls: mls.entries.map(mapSm),
              source: 'sportmonks' as const,
            } satisfies LcStandingsPayload;
          }
        } catch {
          /* fall through */
        }
      }

      return buildLeaguesCupStandingsFromFixtures([]);
    });

    return NextResponse.json(table, { headers: ccHeaders });
  } catch {
    const stale = peekCache<LcStandingsPayload>(CACHE_KEY);
    if (stale) return NextResponse.json({ ...stale, stale: true });
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
