'use client';

import { useEffect, useState } from 'react';
import { startLivePoll } from '@/lib/client/livePoll';
import { sharedJsonFetch, subscribeSharedJson } from '@/lib/client/sharedJson';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import type { JornadaOverview } from '@/lib/sports/jornada';

export const JORNADA_FEED_KEY = 'jornada';
const URL = '/api/jornada';
const COALESCE_MS = 800;

let pace: FreshPace = 'near';
let pollStop: (() => void) | null = null;
let subscribers = 0;

function isOverview(d: unknown): d is JornadaOverview {
  return Boolean(d && typeof d === 'object' && 'live' in d && 'played' in d && 'upcoming' in d);
}

function paceFromOverview(d: JornadaOverview): FreshPace {
  return paceFromFixtures([...d.live, ...d.played, ...d.upcoming]);
}

export function ensureJornadaPoll() {
  subscribers += 1;
  if (pollStop) return;
  pollStop = startLivePoll(
    () => {
      void sharedJsonFetch<JornadaOverview>(JORNADA_FEED_KEY, URL, COALESCE_MS).then((d) => {
        if (!isOverview(d)) return;
        pace = paceFromOverview(d);
      });
    },
    { getPace: () => pace }
  );
}

export function releaseJornadaPoll() {
  subscribers -= 1;
  if (subscribers <= 0 && pollStop) {
    pollStop();
    pollStop = null;
    subscribers = 0;
  }
}

/**
 * Shared jornada board — one timer + one HTTP call for hero, sellados, and Toma.
 * Pass a server-rendered `initial` overview so the first paint is crawlable HTML
 * (SSR) and there is no "Cargando…" flash before the live poll takes over.
 */
export function useJornadaOverview(initial: JornadaOverview | null = null) {
  const [payload, setPayload] = useState<JornadaOverview | null>(initial);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    const unsub = subscribeSharedJson<JornadaOverview>(JORNADA_FEED_KEY, (d) => {
      if (!isOverview(d)) {
        setLoading(false);
        return;
      }
      pace = paceFromOverview(d);
      setPayload(d);
      setLoading(false);
    });
    ensureJornadaPoll();
    return () => {
      unsub();
      releaseJornadaPoll();
    };
  }, []);

  return { payload, loading };
}
