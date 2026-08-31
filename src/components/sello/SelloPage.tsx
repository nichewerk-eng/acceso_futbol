'use client';

import { useMemo } from 'react';
import { SelloPreview } from '@/components/sello/SelloPreview';
import { SelloShare } from '@/components/sello/SelloShare';
import { useGravity } from '@/contexts/GravityContext';
import { mintFromFixture } from '@/lib/sello/mint';
import type { Fixture } from '@/lib/sports/types';

export function SelloPage({ fixture }: { fixture: Fixture }) {
  const { clubId, elTri } = useGravity();
  const mint = useMemo(
    () => mintFromFixture(fixture, { clubId, elTri }),
    [fixture, clubId, elTri]
  );

  return (
    <section className="sello-page" data-testid="page-sello">
      <p className="af-tele text-center">
        <span className="text-signal">AF</span>
        ://SELLO
      </p>
      <div className="sello-page-frame">
        <SelloPreview mint={mint} />
      </div>
      <div className="sello-page-actions">
        <SelloShare mint={mint} className="sello-share-btn" testId="sello-share" />
      </div>
    </section>
  );
}
