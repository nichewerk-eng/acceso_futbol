import { serveSwr } from '@/lib/serveSwr';
import { FRESH } from '@/lib/sports/freshness';
import { fetchLigaMxLeaders, type GoleoBoard } from '@/lib/sports/leaders';

const CACHE_KEY = 'ligamx-leaders-v2-live-overlay';

export async function GET() {
  return serveSwr<GoleoBoard>({
    key: CACHE_KEY,
    ttlMs: FRESH.apiTtlNearMs,
    coalesceMs: FRESH.apiTtlNearMs,
    staleOk: false,
    loader: async () => {
      const board = await fetchLigaMxLeaders();
      if (!board) {
        return {
          seasonLabel: 'Apertura 2026',
          goals: [],
          assists: [],
          generatedAt: new Date().toISOString(),
        };
      }
      return board;
    },
    headers: () => ({
      'Cache-Control': 'private, no-store, no-cache, must-revalidate',
    }),
  });
}
