'use client';

import { useEffect, useState } from 'react';
import type { Story } from '@/lib/news/types';
import type { PulsePayload } from '@/lib/sports';
import { useGravity } from '@/contexts/GravityContext';
import { SiteFooter } from '@/components/home/SiteFooter';
import { EngagementDock } from './EngagementDock';
import { GamesOfDayBanner } from './GamesOfDayBanner';
import { GravityClaim } from './GravityClaim';
import { JornadaRecap } from './JornadaRecap';
import { PulseHero } from './PulseHero';
import { PulseNav } from './PulseNav';
import { ShowStrip } from './ShowStrip';
import { StoriesRail } from './StoriesRail';

export function PulseHome() {
  const [pulse, setPulse] = useState<PulsePayload | null>(null);
  const [leadStory, setLeadStory] = useState<Story | null>(null);
  const { settled } = useGravity();

  useEffect(() => {
    let cancelled = false;
    const loadPulse = () => {
      fetch('/api/pulse')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: PulsePayload | null) => {
          if (!cancelled && d && !('error' in d)) setPulse(d);
        })
        .catch(() => {});
    };
    loadPulse();
    const t = setInterval(loadPulse, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

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
        <GamesOfDayBanner />
        {settled && <GravityClaim />}
        <JornadaRecap />
        <StoriesRail />
        <ShowStrip />
        {pulse && (
          <p
            data-testid="pulse-data-footer"
            className="border-t border-line px-4 py-5 text-center font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60"
          >
            AF://DATA · {pulse.source === 'sportmonks' ? 'Sportmonks' : pulse.source === 'espn' ? 'ESPN' : 'calendario'}
            {' · '}
            CABLE · Mediotiempo / TUDN / ESPN / Marca
          </p>
        )}
      </main>
      <SiteFooter />
      <EngagementDock />
    </div>
  );
}
