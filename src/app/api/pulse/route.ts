import { serveSwr } from '@/lib/serveSwr';
import { getPulse } from '@/lib/sports';
import type { PulsePayload } from '@/lib/sports';
import { paintDondeVerList } from '@/lib/dondeVer/sheet';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';

const CACHE_KEY = 'pulse-v6-dv-sheet';

export async function GET() {
  return serveSwr<PulsePayload>({
    key: CACHE_KEY,
    ttlMs: (p) =>
      apiTtlMsForPace(paceFromFixtures([...p.live, ...p.upcoming, ...p.recent])),
    staleOk: (p) =>
      paceFromFixtures([...p.live, ...p.upcoming, ...p.recent]) !== 'live',
    loader: () => getPulse(),
    map: async (p) => ({
      ...p,
      live: await paintDondeVerList(p.live),
      upcoming: await paintDondeVerList(p.upcoming),
      recent: await paintDondeVerList(p.recent),
    }),
    headers: (pulse, { stale }) => {
      const pace = paceFromFixtures([...pulse.live, ...pulse.upcoming, ...pulse.recent]);
      return {
        ...liveCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
