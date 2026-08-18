import { serveSwr } from '@/lib/serveSwr';
import { FRESH, standingsCacheHeaders } from '@/lib/sports/freshness';
import { fetchLigaMxFemenilStandings, sportmonksEnabled } from '@/lib/sports/sportmonks';
import type { LigaMXTable } from '@/app/api/ligamx/standings/route';

const CACHE_KEY = 'ligamx-femenil-standings-v2-groups';
const ccHeaders = standingsCacheHeaders();

export async function GET() {
  return serveSwr<LigaMXTable>({
    key: CACHE_KEY,
    ttlMs: FRESH.standingsTtlMs,
    coalesceMs: FRESH.standingsTtlMs,
    loader: async () => {
      if (!sportmonksEnabled()) {
        return { season: 'Apertura 2026', entries: [], source: 'sportmonks' as const };
      }
      const sm = await fetchLigaMxFemenilStandings();
      return { ...sm, source: 'sportmonks' as const };
    },
    headers: () => ccHeaders,
  });
}
