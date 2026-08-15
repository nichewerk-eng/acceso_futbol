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
): { remote: JornadaTake | null; pending: boolean } {
  const [remote, setRemote] = useState<JornadaTake | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    setRemote(null);
    setPending(enabled);
  }, [jornada?.number, enabled]);

  useEffect(() => {
    if (!jornada || !enabled) {
      setPending(false);
      return;
    }
    let cancelled = false;
    let first = true;
    const load = () => {
      fetch('/api/toma')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { take?: JornadaTake } | null) => {
          if (!cancelled && d?.take) setRemote(d.take);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled && first) {
            first = false;
            setPending(false);
          }
        });
    };
    load();
    const ms = jornada.live.length > 0 ? LIVE_MS : IDLE_MS;
    const t = setInterval(load, ms);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [enabled, jornada?.number, jornada?.live.length]);

  return { remote, pending };
}
