'use client';

import { useMemo } from 'react';
import { JornadaTakeBoard } from '@/components/living-room/JornadaTake';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import { useTomaTake } from '@/lib/client/useTomaTake';
import { buildJornadaTake, mergeJornadaTake } from '@/lib/sports/jornadaTake';

export function TomaRoom() {
  const { payload: data } = useJornadaOverview();
  const { remote, pending } = useTomaTake(data);

  const take = useMemo(() => {
    if (!data) return null;
    const local = buildJornadaTake(data);
    if (!local) return null;
    return remote ? mergeJornadaTake(local, remote) : local;
  }, [data, remote]);

  if (!data || pending) {
    return <JornadaTakeBoard take={null} pending />;
  }

  if (!take) {
    return (
      <div data-testid="toma-empty">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://TOMA
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide">
          La toma llega con la fecha
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
          Cuando la jornada tenga partidos, Acceso escribe lo que importó — no la tabla.
        </p>
      </div>
    );
  }

  return <JornadaTakeBoard take={take} />;
}
