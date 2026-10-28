import { serveSwr } from '@/lib/serveSwr';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import {
  getGamesOfDay,
  seedGamesOfDay,
  type GamesOfDayPayload,
} from '@/lib/sports/gamesOfDay';
import { paintDondeVerList } from '@/lib/dondeVer/sheet';

const CACHE_KEY = 'games-of-day-v18-dv-sheet';

export async function GET() {
  return serveSwr<GamesOfDayPayload>({
    key: CACHE_KEY,
    ttlMs: (payload) => apiTtlMsForPace(paceFromFixtures(payload.games)),
    staleOk: (payload) => paceFromFixtures(payload.games) !== 'live',
    loader: () => getGamesOfDay(),
    seed: () => seedGamesOfDay(),
    map: async (payload) => ({
      ...payload,
      games: await paintDondeVerList(payload.games),
    }),
    headers: (payload, { stale }) => {
      const pace = paceFromFixtures(payload.games);
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
