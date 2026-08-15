'use client';

import Link from 'next/link';
import { TomaListen } from '@/components/living-room/TomaListen';
import { TomaShare } from '@/components/living-room/TomaShare';
import type { JornadaTake } from '@/lib/sports/jornadaTake';

export function JornadaTakeBoard({ take }: { take: JornadaTake }) {
  return (
    <section className="toma-board" id="toma" data-testid="section-toma">
      <div className="toma-mast">
        <p className="toma-stamp" data-testid="toma-stamp">
          {take.jornadaNum != null ? `J${take.jornadaNum}` : 'MX'}
        </p>
        <div className="toma-actions">
          <TomaListen take={take} />
          <TomaShare take={take} />
        </div>
      </div>

      {take.href ? (
        <Link href={take.href} className="toma-lead" data-testid="toma-lead">
          <h3 className="toma-headline">{take.headline}</h3>
        </Link>
      ) : (
        <h3 className="toma-headline" data-testid="toma-lead">
          {take.headline}
        </h3>
      )}
      <p className="toma-dek">{take.dek}</p>

      {take.body && take.body.length > 0 ? (
        <>
          <div className="toma-body" data-testid="toma-body">
            {take.body.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {take.cites && take.cites.length > 0 ? (
            <p className="toma-cites" data-testid="toma-cites">
              {take.cites.join(' · ')}
            </p>
          ) : null}
        </>
      ) : null}

      {take.beats.length > 0 ? (
        <ol className="toma-stakes">
          {take.beats.map((b, i) => (
            <li key={b.id}>
              <Link href={b.href} className={b.lock ? 'is-lock' : undefined}>
                <span className="toma-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="toma-stake">
                  <span className="toma-when">{b.lock ? `LOCK · ${b.kicker}` : b.kicker}</span>
                  <span className="toma-beat-line">{b.line}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
