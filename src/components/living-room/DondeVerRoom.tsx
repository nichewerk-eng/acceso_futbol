'use client';

import { DondeVerGuide } from '@/components/living-room/DondeVerGuide';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import type { JornadaOverview } from '@/lib/sports/jornada';

export function DondeVerRoom({ initial = null }: { initial?: JornadaOverview | null }) {
  const { payload: data } = useJornadaOverview(initial);
  const tz = useDeviceTimeZone();

  if (!data) {
    return (
      <p className="af-tele py-16" data-testid="donde-ver-loading">
        Cargando guía…
      </p>
    );
  }

  if (!data.live.length && !data.upcoming.length && !data.played.length) {
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
      played={data.played}
      tz={tz}
      asPage
      showRitual={false}
    />
  );
}
