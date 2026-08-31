'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SelloPreview } from '@/components/sello/SelloPreview';
import { SelloShare } from '@/components/sello/SelloShare';
import { useGravity } from '@/contexts/GravityContext';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { useSelloFollows } from '@/lib/client/selloFollow';
import { stabilizeAlertSnap } from '@/lib/push/matchAlerts';
import {
  fixtureMatchesGravity,
  mintFromFixture,
  selloAlerts,
  selloSnap,
  type SelloSnap,
} from '@/lib/sello/mint';
import type { SelloMint } from '@/lib/sello/types';

const SS_KEY = 'af-sello-seen-v1';

function readSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify([...ids].slice(-40)));
  } catch {
    /* quota */
  }
}

export function SelloHost() {
  const pathname = usePathname();
  const { clubId, elTri } = useGravity();
  const follows = useSelloFollows();
  const { payload } = useGamesOfDay();
  const [overlay, setOverlay] = useState<SelloMint | null>(null);
  const prevRef = useRef<Map<string, SelloSnap> | null>(null);
  const primedFor = useRef('');
  const seenRef = useRef<Set<string> | null>(null);

  const games = payload?.games ?? [];
  const muted = Boolean(pathname?.startsWith('/sello/'));
  const hasGravity = Boolean(clubId || elTri);

  useEffect(() => {
    if (muted) {
      prevRef.current = null;
      primedFor.current = '';
      return;
    }
    if (!seenRef.current) seenRef.current = readSeen();

    const followIds = new Set(follows.map((f) => f.id));
    const watch = games.filter((g) => {
      if (followIds.has(g.id)) return true;
      if (hasGravity && fixtureMatchesGravity(g, { clubId, elTri })) return true;
      return false;
    });
    const key = watch.map((g) => g.id).join('|');
    if (!prevRef.current || primedFor.current !== key) {
      prevRef.current = new Map(watch.map((g) => [g.id, selloSnap(g)]));
      primedFor.current = key;
      return;
    }

    for (const g of watch) {
      const prev = prevRef.current.get(g.id);
      const next = stabilizeAlertSnap(prev, selloSnap(g));
      const kinds = selloAlerts(prev, next).filter((k) => k !== 'kickoff');
      prevRef.current.set(g.id, next);
      if (kinds.length === 0) continue;
      const mint = mintFromFixture(g, { clubId, elTri });
      if (seenRef.current.has(mint.id)) continue;
      seenRef.current.add(mint.id);
      writeSeen(seenRef.current);
      setOverlay(mint);
      break;
    }
  }, [games, clubId, elTri, hasGravity, muted, follows]);

  if (!overlay || muted) return null;

  return (
    <div
      className="sello-overlay"
      data-testid="sello-overlay"
      role="dialog"
      aria-label="Compartir marcador"
    >
      <button
        type="button"
        className="sello-overlay-dim"
        aria-label="Cerrar"
        onClick={() => setOverlay(null)}
      />
      <div className="sello-overlay-panel">
        <SelloPreview mint={overlay} />
        <div className="sello-overlay-actions">
          <SelloShare mint={overlay} className="sello-share-btn" testId="sello-overlay-share" />
          <Link href={overlay.partidoHref} className="sello-overlay-link" onClick={() => setOverlay(null)}>
            Capítulo
          </Link>
          <button type="button" className="sello-overlay-dismiss" onClick={() => setOverlay(null)}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
