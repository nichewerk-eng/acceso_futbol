import { serveSwr } from '@/lib/serveSwr';
import { fetchLeaguesCupLiveBoard } from '@/lib/sports';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import type { Fixture } from '@/lib/sports/types';

const CACHE_KEY = 'leagues-cup-fixtures-v16-ko-tree';

type Payload = { fixtures: Fixture[]; source: string };

export async function GET() {
  return serveSwr<Payload>({
    key: CACHE_KEY,
    ttlMs: (p) => apiTtlMsForPace(paceFromFixtures(p.fixtures)),
    staleOk: (p) => paceFromFixtures(p.fixtures) !== 'live',
    loader: () => fetchLeaguesCupLiveBoard(),
    headers: (payload, { stale }) => {
      const pace = paceFromFixtures(payload.fixtures);
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
