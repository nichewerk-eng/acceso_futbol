'use client';

import { useEffect, useState } from 'react';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { JornadaTake } from '@/lib/sports/jornadaTake';

const LIVE_MS = 90_000;
const IDLE_MS = 15 * 60_000;

/** Server column (stats + cable + Anthropic). Slow on purpose — overlay onto the local board. */
export function useTomaTake(
  jornada: JornadaOverview | null,
  enabled = true
): JornadaTake | null {
  const [remote, setRemote] = useState<JornadaTake | null>(null);

  useEffect(() => {
    setRemote(null);
  }, [jornada?.number]);

  useEffect(() => {
    if (!jornada || !enabled) return;
    let cancelled = false;
    const load = () => {
      fetch('/api/toma')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { take?: JornadaTake } | null) => {
          if (!cancelled && d?.take) setRemote(d.take);
        })
        .catch(() => {});
    };
    load();
    const ms = jornada.live.length > 0 ? LIVE_MS : IDLE_MS;
    const t = setInterval(load, ms);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [enabled, jornada?.number, jornada?.live.length]);

  return remote;
}
