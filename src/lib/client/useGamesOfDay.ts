'use client';

import { useEffect, useState } from 'react';
import { startLivePoll } from '@/lib/client/livePoll';
import { sharedJsonFetch, subscribeSharedJson } from '@/lib/client/sharedJson';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import type { GamesOfDayPayload } from '@/lib/sports';

const KEY = 'games-of-day';
const URL = '/api/games-of-day';
const COALESCE_MS = 800;
const SS_KEY = 'af-games-of-day-v9';
const SS_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const STATIC_RETRY_MS = 1_500;

let pace: FreshPace = 'near';
let pollStop: (() => void) | null = null;
let subscribers = 0;

function readSessionSeed(): GamesOfDayPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: GamesOfDayPayload };
    if (!parsed?.data?.games || Date.now() - parsed.ts > SS_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSessionSeed(data: GamesOfDayPayload) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* quota / private mode */
  }
}

function ensureSharedPoll() {
  subscribers += 1;
  if (pollStop) return;
  pollStop = startLivePoll(
    () => {
      void sharedJsonFetch<GamesOfDayPayload>(KEY, URL, COALESCE_MS).then((d) => {
        if (!d || 'error' in d) return;
        pace = paceFromFixtures(d.games ?? []);
      });
    },
    { getPace: () => pace }
  );
}

function releaseSharedPoll() {
  subscribers -= 1;
  if (subscribers <= 0 && pollStop) {
    pollStop();
    pollStop = null;
    subscribers = 0;
  }
}

/**
 * Shared games-of-day feed — one timer + one HTTP call for all living-room widgets.
 * sessionStorage paints the last slate before the network round-trip.
 */
export function useGamesOfDay() {
  const [payload, setPayload] = useState<GamesOfDayPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let staticRetry: ReturnType<typeof setTimeout> | null = null;
    let staticAttempts = 0;
    const armStaticRetry = (source?: string) => {
      if (staticRetry) {
        clearTimeout(staticRetry);
        staticRetry = null;
      }
      if (source === 'static' && staticAttempts < 4) {
        staticAttempts += 1;
        staticRetry = setTimeout(() => {
          void sharedJsonFetch<GamesOfDayPayload>(KEY, URL, 0);
        }, STATIC_RETRY_MS);
      }
    };

    const seed = readSessionSeed();
    if (seed) {
      pace = paceFromFixtures(seed.games ?? []);
      setPayload(seed);
      setLoading(false);
      armStaticRetry(seed.source);
    }

    const unsub = subscribeSharedJson<GamesOfDayPayload>(KEY, (d) => {
      if (!d || 'error' in d) {
        setLoading(false);
        return;
      }
      pace = paceFromFixtures(d.games ?? []);
      setPayload(d);
      setLoading(false);
      writeSessionSeed(d);
      armStaticRetry(d.source);
    });
    ensureSharedPoll();
    return () => {
      unsub();
      releaseSharedPoll();
      if (staticRetry) clearTimeout(staticRetry);
    };
  }, []);

  return { payload, loading };
}
