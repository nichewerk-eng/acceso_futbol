import { serveSwr } from '@/lib/serveSwr';
import { apiTtlMsForPace, boardCacheHeaders, paceFromFixtures } from '@/lib/sports/freshness';
import { liguillaFixtures } from '@/lib/sports/liguilla';
import {
  getLiguillaBoard,
  repaintLiguillaBoard,
  type LiguillaPayload,
} from '@/lib/sports/liguillaBoard';

const CACHE_KEY = 'liguilla-board-v1-ap26';

function pace(p: LiguillaPayload) {
  return paceFromFixtures(liguillaFixtures(p));
}

export async function GET() {
  return serveSwr<LiguillaPayload>({
    key: CACHE_KEY,
    ttlMs: (p) => apiTtlMsForPace(pace(p)),
    staleOk: (p) => pace(p) !== 'live',
    loader: () => getLiguillaBoard(),
    map: (p) => repaintLiguillaBoard(p),
    headers: (p, { stale }) => {
      const now = pace(p);
      return {
        ...boardCacheHeaders(now),
        'X-AF-Pace': now,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
