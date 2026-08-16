'use client';

import { useEffect, useState } from 'react';
import { DondeVerGuide } from '@/components/living-room/DondeVerGuide';
import { useGravity } from '@/contexts/GravityContext';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import type { Fixture } from '@/lib/sports';

export function DondeVerRoom() {
  const { matchesGravity } = useGravity();
  const { payload: data } = useJornadaOverview();
  const [tz, setTz] = useState('America/Mexico_City');

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone) setTz(zone);
  }, []);

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  if (!data) {
    return (
      <p className="af-tele py-16" data-testid="donde-ver-loading">
        Cargando guía…
      </p>
    );
  }

  if (!data.live.length && !data.upcoming.length) {
    return (
      <div className="dv-guide" data-testid="section-donde-ver">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://DONDE-VER
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          Dónde ver{data.number ? ` · Jornada ${data.number}` : ''}
        </h1>
        <p className="mt-3 max-w-lg font-mono text-[12px] leading-6 text-muted">
          Fecha sellada. La siguiente guía llega con la próxima jornada.
        </p>
      </div>
    );
  }

  return (
    <DondeVerGuide
      jornadaNum={data.number}
      live={data.live}
      upcoming={data.upcoming}
      tz={tz}
      isMine={isMine}
    />
  );
}
