'use client';

import { useEffect, useState } from 'react';
import type { TotwBoard } from '@/lib/sports/totw';

export function useTotw(jornada?: number | null, initial: TotwBoard | null = null) {
  const [payload, setPayload] = useState<TotwBoard | null>(initial);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;
    if (!initial) setLoading(true);
    const q = jornada != null ? `?jornada=${jornada}` : '';
    fetch(`/api/totw${q}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TotwBoard | null) => {
        if (!cancelled) setPayload(d);
      })
      .catch(() => {
        if (!cancelled && !initial) setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jornada, initial]);

  return { payload, loading };
}
