'use client';

import { useMemo } from 'react';
import { JornadaTakeBoard } from '@/components/living-room/JornadaTake';
import { useGravity } from '@/contexts/GravityContext';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import { useTomaTake } from '@/lib/client/useTomaTake';
import { buildJornadaTake, mergeJornadaTake } from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports';

export function TomaRoom() {
  const { matchesGravity, club, elTri } = useGravity();
  const { payload: data } = useJornadaOverview();

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  const { remote, pending } = useTomaTake(data);

  const take = useMemo(() => {
    if (!data) return null;
    const local = buildJornadaTake(data, {
      isMine,
      lockAbbr: club?.abbreviation ?? (elTri ? 'MEX' : null),
    });
    if (!local) return null;
    return remote ? mergeJornadaTake(local, remote) : local;
  }, [data, club, elTri, matchesGravity, remote]);

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
