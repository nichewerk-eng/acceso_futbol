'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TomaDeskSkeleton, TomaPlayer } from '@/components/living-room/TomaPlayer';
import { jornadaTakeColumnBody, type JornadaTake } from '@/lib/sports/jornadaTake';

export function JornadaTakeBoard({
  take,
  pending = false,
}: {
  take: JornadaTake | null;
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ready = Boolean(take) && !pending;

  if (!take && !pending) return null;

  return (
    <section className="toma-board" id="toma" data-testid="section-toma">
      {ready && take ? <TomaPlayer take={take} /> : <TomaDeskSkeleton />}

      {ready && take ? (
        <button
          type="button"
          className="toma-leer"
          data-testid="toma-leer"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cerrar texto' : 'Leer la toma'}
        </button>
      ) : (
        <p className="toma-leer is-wait" data-testid="toma-loading">
          Armando la toma…
        </p>
      )}

      {open && take ? (
        <div className="toma-script" data-testid="toma-body">
          <h3 className="toma-headline">{take.headline.replace(/LigaMX/gi, 'Liga MX')}</h3>
          {jornadaTakeColumnBody(take).map((p, i) => (
            <p key={i}>{p.replace(/LigaMX/gi, 'Liga MX')}</p>
          ))}
          {take.cites && take.cites.length > 0 ? (
            <p className="toma-cites">{take.cites.join(' · ')}</p>
          ) : null}
          {take.beats.length > 0 ? (
            <ol className="toma-stakes">
              {take.beats.map((b, i) => (
                <li key={b.id}>
                  <Link href={b.href}>
                    <span className="toma-n">{String(i + 1).padStart(2, '0')}</span>
                    <span className="toma-stake">
                      <span className="toma-when">{b.kicker}</span>
                      <span className="toma-beat-line">{b.line}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
