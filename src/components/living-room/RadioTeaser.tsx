'use client';

import Link from 'next/link';

export function RadioTeaser() {
  return (
    <section
      id="radio"
      data-testid="section-radio"
      className="border-b border-line bg-bg-2 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://RADIO
        </p>
        <h2
          className="mt-3 max-w-xl font-display text-3xl font-bold uppercase tracking-wide sm:text-5xl"
          data-testid="radio-title"
        >
          Acceso en tu oído.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
          Pre-show 15 min antes. Recap podcast al final.
          Entra desde Hoy o desde la ficha del partido.
        </p>
        <Link href="/#hoy" className="af-cta mt-7" data-testid="radio-cta-hoy">
          Ir a partidos de hoy
        </Link>
      </div>
    </section>
  );
}
