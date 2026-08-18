import { serveSwr } from '@/lib/serveSwr';
import {
  apiTtlMsForPace,
  boardCacheHeaders,
  paceFromFixtures,
} from '@/lib/sports/freshness';
import { fixtureToLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';
import { fetchLigaMxFemenilFixtures } from '@/lib/sports/ligaMxFemenilBoard';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';

const CACHE_KEY = 'ligamx-femenil-fixtures-v1';

type FixturesPayload = { fixtures: LigaMXFixture[]; source: string };

export async function GET() {
  return serveSwr<FixturesPayload>({
    key: CACHE_KEY,
    ttlMs: (p) =>
      apiTtlMsForPace(
        paceFromFixtures(
          p.fixtures.map((f) => ({
            state: f.status.state,
            date: f.date,
            clock: f.status.displayClock,
          }))
        )
      ),
    staleOk: (p) =>
      paceFromFixtures(
        p.fixtures.map((f) => ({
          state: f.status.state,
          date: f.date,
          clock: f.status.displayClock,
        }))
      ) !== 'live',
    loader: async () => {
      const board = await fetchLigaMxFemenilFixtures();
      return {
        fixtures: board.fixtures.map(fixtureToLigaMxSchedule),
        source: board.source,
      };
    },
    headers: (payload, { stale }) => {
      const pace = paceFromFixtures(
        payload.fixtures.map((f) => ({
          state: f.status.state,
          date: f.date,
          clock: f.status.displayClock,
        }))
      );
      return {
        ...boardCacheHeaders(pace),
        'X-AF-Pace': pace,
        'X-AF-Stale': stale ? '1' : '0',
      };
    },
  });
}
