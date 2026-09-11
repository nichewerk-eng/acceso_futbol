import { serveSwr } from '@/lib/serveSwr';
import {
  fetchLigaMxChampionBoard,
  type KalshiChampionBoard,
} from '@/lib/kalshi/ligaMxChampion';
import { FRESH } from '@/lib/sports/freshness';

const CACHE_KEY = 'kalshi-liga-mx-champion-v1';

export type { KalshiChampionBoard };

export async function GET() {
  return serveSwr<KalshiChampionBoard | { empty: true }>({
    key: CACHE_KEY,
    ttlMs: FRESH.kalshiTtlMs,
    coalesceMs: FRESH.kalshiTtlMs,
    loader: async () => {
      const board = await fetchLigaMxChampionBoard();
      return board ?? { empty: true as const };
    },
    notFound: (data) => 'empty' in data && data.empty,
    headers: () => ({
      'Cache-Control': `public, s-maxage=${FRESH.kalshiSMaxAge}, stale-while-revalidate=${FRESH.kalshiSMaxAge * 2}`,
    }),
  });
}
