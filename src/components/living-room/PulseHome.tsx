'use client';

import { useEffect, useState } from 'react';
import type { Story } from '@/lib/news/types';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { useGravity } from '@/contexts/GravityContext';
import { ClubsNav } from '@/components/club/ClubsNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { EngagementDock } from './EngagementDock';
import { GravityClaim } from './GravityClaim';
import { JornadaRecap } from './JornadaRecap';
import { PulseHero } from './PulseHero';
import { PulseNav } from './PulseNav';
import { ShowStrip } from './ShowStrip';
import { StoriesRail } from './StoriesRail';

export function PulseHome() {
  const [leadStory, setLeadStory] = useState<Story | null>(null);
  const { payload } = useGamesOfDay();
  const { settled, club } = useGravity();
  const source = payload?.source;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stories?: Story[] } | null) => {
        if (!cancelled) {
          const list = d?.stories ?? [];
          setLeadStory(
            list.find((s) => s.sourceId === 'espn' && s.image) ??
              list.find((s) => s.sourceId === 'espn') ??
              null
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      data-testid="page-pulse-home"
      className="flex min-h-screen flex-col bg-bg-1 pb-16 text-foreground"
    >
      <PulseNav />
      <main className="flex-1" data-testid="pulse-main">
        <PulseHero leadStory={leadStory} />
        {!settled && <GravityClaim />}
        {settled && (
          <div className="border-b border-line px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <ClubsNav
                activeSlug={club?.id}
                dek="Entra a la sala — partidos, pulso y cobertura de tu club."
              />
            </div>
          </div>
        )}
        {/* Cabina / Acceso Radio — hidden until scripts are ready */}
        <JornadaRecap />
        <StoriesRail />
        <ShowStrip />
        {source && (
          <p
            data-testid="pulse-data-footer"
            className="border-t border-line px-4 py-5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60"
          >
            AF://DATA ·{' '}
            {source === 'sportmonks'
              ? 'Sportmonks'
              : source === 'espn'
                ? 'ESPN'
                : source === 'mixed'
                  ? 'Sportmonks + Selección'
                  : 'calendario'}
            {' · '}
            NEWS · Mediotiempo / TUDN / ESPN / Marca
          </p>
        )}
      </main>
      <SiteFooter />
      <EngagementDock />
    </div>
  );
}
