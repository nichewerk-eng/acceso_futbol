import { serveSwr } from '@/lib/serveSwr';
import {
  fetchLigaMxGamesBoard,
  type KalshiGamesBoard,
} from '@/lib/kalshi/ligaMxGames';
import { FRESH } from '@/lib/sports/freshness';

const CACHE_KEY = 'kalshi-liga-mx-games-v1';

export type { KalshiGamesBoard };

export async function GET() {
  return serveSwr<KalshiGamesBoard>({
    key: CACHE_KEY,
    ttlMs: FRESH.kalshiTtlMs,
    coalesceMs: FRESH.kalshiTtlMs,
    loader: () => fetchLigaMxGamesBoard(),
    headers: () => ({
      'Cache-Control': `public, s-maxage=${FRESH.kalshiSMaxAge}, stale-while-revalidate=${FRESH.kalshiSMaxAge * 2}`,
    }),
  });
}
