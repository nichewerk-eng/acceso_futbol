'use client';

import { useEffect, useState } from 'react';
import type { LigaMXEntry, LigaMXTable } from '@/app/api/ligamx/standings/route';
import { recordFromTabla } from '@/lib/sports/standingsRecord';

let cached: LigaMXEntry[] | null = null;
let inflight: Promise<LigaMXEntry[] | null> | null = null;

async function loadStandings(): Promise<LigaMXEntry[] | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/api/ligamx/standings')
    .then(async (r) => {
      if (!r.ok) return cached;
      const d = (await r.json()) as LigaMXTable;
      if (Array.isArray(d.entries) && d.entries.length) {
        cached = d.entries;
      }
      return cached;
    })
    .catch(() => cached)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Shared Liga MX tabla for W-D-L chips on hero / capítulo. */
export function useLigaMxRecords() {
  const [tabla, setTabla] = useState<LigaMXEntry[] | null>(cached);

  useEffect(() => {
    let stop = false;
    void loadStandings().then((rows) => {
      if (!stop && rows) setTabla(rows);
    });
    return () => {
      stop = true;
    };
  }, []);

  return {
    recordFor: (abbr: string) => recordFromTabla(tabla, abbr),
  };
}
