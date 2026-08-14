import { serveSwr } from '@/lib/serveSwr';
import { getPulse } from '@/lib/sports';
import type { PulsePayload } from '@/lib/sports';
import {
  apiTtlMsForPace,
  liveCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';

const CACHE_KEY = 'pulse-v4-lanes';

export async function GET() {
  return serveSwr<PulsePayload>({
    key: CACHE_KEY,
    ttlMs: (p) =>
      apiTtlMsForPace(paceFromFixtures([...p.live, ...p.upcoming, ...p.recent])),
    loader: () => getPulse(),
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
