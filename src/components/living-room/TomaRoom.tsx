'use client';

import { useEffect, useMemo, useState } from 'react';
import { JornadaTakeBoard } from '@/components/living-room/JornadaTake';
import { useGravity } from '@/contexts/GravityContext';
import { liveFetch } from '@/lib/client/liveFetch';
import { startLivePoll } from '@/lib/client/livePoll';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import { useTomaTake } from '@/lib/client/useTomaTake';
import { buildJornadaTake, mergeJornadaTake } from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports';
import type { JornadaOverview } from '@/lib/sports/jornada';

export function TomaRoom() {
  const { matchesGravity, club, elTri } = useGravity();
  const [data, setData] = useState<JornadaOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pace: FreshPace = 'near';
    const load = () => {
      liveFetch('/api/jornada')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: JornadaOverview | null) => {
          if (cancelled) return;
          pace = d ? paceFromFixtures([...d.live, ...d.played, ...d.upcoming]) : 'idle';
          setData(d);
        })
        .catch(() => {});
    };
    const stop = startLivePoll(load, { getPace: () => pace });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

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
