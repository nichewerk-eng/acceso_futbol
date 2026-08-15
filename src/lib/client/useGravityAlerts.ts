'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useGravity } from '@/contexts/GravityContext';
import { sharedJsonFetch, subscribeSharedJson } from '@/lib/client/sharedJson';
import {
  emitGravityAlert,
  getGravityAlertsOn,
  getGravityToasts,
  hydrateGravityAlerts,
  subscribeGravityAlerts,
  subscribeGravityToasts,
  type GravityToast,
} from '@/lib/client/gravityAlerts';
import { leaguePath } from '@/lib/radio/phases';
import type { DayGame, GamesOfDayPayload } from '@/lib/sports';

type Snap = { state: DayGame['state']; hs: string; as: string };

function nums(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function scoreKey(g: DayGame): Snap {
  return {
    state: g.state,
    hs: String(g.home.score ?? ''),
    as: String(g.away.score ?? ''),
  };
}

function notify(title: string, body: string, tag: string, href: string) {
  emitGravityAlert(title, body, tag, href);
}

const EMPTY_TOASTS: GravityToast[] = [];

export function useGravityToasts() {
  return useSyncExternalStore(subscribeGravityToasts, getGravityToasts, () => EMPTY_TOASTS);
}

export function useGravityAlertPref() {
  useEffect(() => {
    hydrateGravityAlerts();
  }, []);
  return useSyncExternalStore(subscribeGravityAlerts, getGravityAlertsOn, () => false);
}

export function useGravityAlertWatcher() {
  const on = useGravityAlertPref();
  const { settled, matchesGravity } = useGravity();
  const [games, setGames] = useState<DayGame[]>([]);
  const prevRef = useRef<Map<string, Snap> | null>(null);
  const primedFor = useRef<string>('');

  useEffect(() => {
    if (!on || !settled) {
      setGames([]);
      return;
    }
    const unsub = subscribeSharedJson<GamesOfDayPayload>('games-of-day', (d) => {
      if (d?.games) setGames(d.games);
    });
    const load = () => {
      void sharedJsonFetch<GamesOfDayPayload>('games-of-day', '/api/games-of-day', 2_000);
    };
    load();
    const id = window.setInterval(load, 12_000);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, [on, settled]);

  useEffect(() => {
    if (!on || !settled) {
      prevRef.current = null;
      primedFor.current = '';
      return;
    }
    const mine = games.filter((g) =>
      matchesGravity(g.home.name, g.away.name, g.home.abbreviation, g.away.abbreviation)
    );
    const key = mine.map((g) => g.id).join('|');
    if (!prevRef.current || primedFor.current !== key) {
      prevRef.current = new Map(mine.map((g) => [g.id, scoreKey(g)]));
      primedFor.current = key;
      return;
    }

    for (const g of mine) {
      const prev = prevRef.current.get(g.id);
      const next = scoreKey(g);
      const href = `/partido/${leaguePath(g.league)}/${g.id}`;
      const pair = `${g.home.abbreviation} vs ${g.away.abbreviation}`;

      if (prev && prev.state !== 'in' && next.state === 'in') {
        notify('Arranca tu partido', pair, `af-kick-${g.id}`, href);
      }
      if (
        prev &&
        (nums(prev.hs) !== nums(next.hs) || nums(prev.as) !== nums(next.as)) &&
        (next.state === 'in' || next.state === 'post')
      ) {
        notify(
          `GOL · ${g.home.abbreviation} ${next.hs || '0'}-${next.as || '0'} ${g.away.abbreviation}`,
          pair,
          `af-gol-${g.id}-${next.hs}-${next.as}`,
          href
        );
      }
      prevRef.current.set(g.id, next);
    }
  }, [on, settled, games, matchesGravity]);
}
