'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STYLES = [
  { id: 'caliente', label: 'Caliente', blurb: 'Gritos, rivalidad, sangre en el ojo.' },
  { id: 'tactico', label: 'Táctico', blurb: 'Forma, lecturas, el partido frío.' },
  { id: 'puente', label: 'Puente', blurb: 'MX ↔ US. Dónde lo ves. Misma cabina.' },
] as const;

type StyleId = (typeof STYLES)[number]['id'];
const STYLE_KEY = 'af-radio-style';

export function RadioTeaser() {
  const [style, setStyle] = useState<StyleId>('caliente');
  const active = STYLES.find((s) => s.id === style)!;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY) as StyleId | null;
      if (saved && STYLES.some((s) => s.id === saved)) setStyle(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function pick(id: StyleId) {
    setStyle(id);
    try {
      localStorage.setItem(STYLE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      id="radio"
      data-testid="section-radio"
      className="border-b border-line bg-bg-2 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://RADIO
          </p>
          <h2
            className="mt-3 font-display text-3xl font-bold uppercase tracking-wide sm:text-5xl"
            data-testid="radio-title"
          >
            Tu narrador.
            <span className="block text-signal">Tu estilo.</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-muted">
            Pre-show 15 min antes. Cabina en vivo con ~30s de retraso. Recap podcast al final.
            Elige voz y entra desde Hoy.
          </p>
          <Link href="/#hoy" className="af-cta mt-7" data-testid="radio-cta-hoy">
            Ir a partidos de hoy
          </Link>
        </div>

        <div className="border border-line bg-bg-1 p-5 sm:p-6" data-testid="radio-style-picker">
          <p className="af-tele mb-4">Selecciona canal de voz</p>
          <div className="grid gap-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                data-testid={`radio-style-${s.id}`}
                className={[
                  'flex items-start justify-between gap-4 border px-4 py-3.5 text-left transition',
                  style === s.id
                    ? 'border-signal bg-signal text-on-signal'
                    : 'border-line hover:border-foreground/40',
                ].join(' ')}
              >
                <span>
                  <span className="block font-display text-lg font-bold uppercase tracking-wide">
                    {s.label}
                  </span>
                  <span
                    className={[
                      'mt-1 block text-sm',
                      style === s.id ? 'text-on-signal/85' : 'text-muted',
                    ].join(' ')}
                  >
                    {s.blurb}
                  </span>
                </span>
                <span className="font-mono text-[10px] tracking-[0.16em] opacity-70">
                  {style === s.id ? 'ON' : 'SET'}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-4 af-tele">
            Activo · {active.label} · se guarda en este dispositivo
          </p>
        </div>
      </div>
    </section>
  );
}
