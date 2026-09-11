'use client';

import { useEffect, useState } from 'react';
import type { KalshiGamesBoard } from '@/lib/kalshi/ligaMxGames';
import { FRESH } from '@/lib/sports/freshness';

let cached: KalshiGamesBoard | null = null;
let inflight: Promise<KalshiGamesBoard | null> | null = null;
let lastAt = 0;

async function loadBoard(force = false): Promise<KalshiGamesBoard | null> {
  const fresh = Date.now() - lastAt < FRESH.kalshiTtlMs;
  if (!force && cached && fresh) return cached;
  if (!force && inflight) return inflight;

  inflight = fetch('/api/kalshi/liga-mx/games')
    .then(async (res) => {
      if (!res.ok) return cached;
      const data = (await res.json()) as KalshiGamesBoard;
      if (data?.byPair) {
        cached = data;
        lastAt = Date.now();
      }
      return cached;
    })
    .catch(() => cached)
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Shared Kalshi Liga MX game board — one fetch for every match card on the page. */
export function useKalshiGamesBoard() {
  const [board, setBoard] = useState<KalshiGamesBoard | null>(cached);

  useEffect(() => {
    let stop = false;
    const pull = () => {
      void loadBoard().then((b) => {
        if (!stop && b) setBoard(b);
      });
    };
    pull();
    const id = setInterval(pull, FRESH.kalshiTtlMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  return board;
}
