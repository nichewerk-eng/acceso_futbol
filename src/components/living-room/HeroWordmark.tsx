'use client';

import { useEffect, useState } from 'react';

const WORD = 'ACCESO';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Stadium-flap ACCESO wordmark — letter cascade on first load only. */
export function HeroWordmark() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setEntered(true);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <h1
      className={['hero-wordmark mt-2 text-foreground', entered ? 'is-entered' : '']
        .filter(Boolean)
        .join(' ')}
      data-testid="hero-headline"
    >
      <span className="hero-wordmark-track" aria-hidden>
        {WORD.split('').map((ch, i) => (
          <span
            key={`${ch}-${i}`}
            className="hero-wordmark-letter"
            style={{ ['--i' as string]: String(i) }}
          >
            {ch}
          </span>
        ))}
      </span>
      <span className="sr-only">
        ACCESO Futbol · Liga MX, Leagues Cup y El Tri en vivo
      </span>
    </h1>
  );
}
