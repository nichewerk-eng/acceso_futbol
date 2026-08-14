import { serveSwr } from '@/lib/serveSwr';
import { buildLeaguesCupBoard, fetchLeaguesCupLiveBoard } from '@/lib/sports';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import type { Fixture } from '@/lib/sports/types';

const CACHE_KEY = 'leagues-cup-fixtures-v11-qf-tv';

type Payload = { fixtures: Fixture[]; source: string };

export async function GET() {
  return serveSwr<Payload>({
    key: CACHE_KEY,
    ttlMs: (p) =>
      apiTtlMsForPace(paceFromFixtures(p.fixtures.filter((f) => !f.id.startsWith('lc-')))),
    loader: () => fetchLeaguesCupLiveBoard(),
    seed: () => ({ fixtures: buildLeaguesCupBoard([]), source: 'official' }),
    headers: (payload, { stale }) => {
      const pace = paceFromFixtures(payload.fixtures.filter((f) => !f.id.startsWith('lc-')));
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
