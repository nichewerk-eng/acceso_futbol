'use client';

import { useEffect, useState } from 'react';
import { startLivePoll } from '@/lib/client/livePoll';
import { sharedJsonFetch, subscribeSharedJson } from '@/lib/client/sharedJson';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import type { GamesOfDayPayload } from '@/lib/sports';

const KEY = 'games-of-day';
const URL = '/api/games-of-day';
const COALESCE_MS = 2_000;

let pace: FreshPace = 'near';
let pollStop: (() => void) | null = null;
let subscribers = 0;

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
 */
export function useGamesOfDay() {
  const [payload, setPayload] = useState<GamesOfDayPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeSharedJson<GamesOfDayPayload>(KEY, (d) => {
      if (!d || 'error' in d) {
        setLoading(false);
        return;
      }
      pace = paceFromFixtures(d.games ?? []);
      setPayload(d);
      setLoading(false);
    });
    ensureSharedPoll();
    return () => {
      unsub();
      releaseSharedPoll();
    };
  }, []);

  return { payload, loading };
}
