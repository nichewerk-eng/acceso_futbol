'use client';

import Link from 'next/link';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import type { Fixture } from '@/lib/sports';

type Props = { live: Fixture[]; upcoming: Fixture[] };

export function LiveStrip({ live, upcoming }: Props) {
  const pool = [...live, ...upcoming].slice(0, 10);

  const sorted = [...pool].sort((a, b) => {
    if (a.state === 'in' && b.state !== 'in') return -1;
    if (b.state === 'in' && a.state !== 'in') return 1;
    return +new Date(a.date) - +new Date(b.date);
  });

  return (
    <section id="ahora" className="border-b border-line px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Ahora</p>
            <h2 className="mt-2 font-display text-2xl font-semibold uppercase tracking-wide text-foreground">
              La jornada
            </h2>
          </div>
          <Link
            href="/liga-mx"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-foreground"
          >
            Tabla →
          </Link>
        </div>

        <div className="mb-6">
          <RitualSlot placement="jornada" />
        </div>

        {sorted.length === 0 ? (
          <p className="text-sm text-muted">
            Sin partidos en ventana. El editorial del pulso cubre la noche.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {sorted.map((f) => {
              return (
                <li key={f.id}>
                  <Link
                    href={`/partido/liga-mx/${f.id}`}
                    className="grid grid-cols-[88px_1fr_auto] items-center gap-4 py-4 transition hover:bg-bg-3/60 sm:grid-cols-[110px_1fr_auto]"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {f.state === 'in' ? (
                        <span className="text-signal">En vivo</span>
                      ) : (
                        f.jornada ?? 'Próximo'
                      )}
                    </span>
                    <span>
                      <span className="block font-display text-base font-semibold uppercase tracking-wide text-foreground sm:text-lg">
                        {f.home.abbreviation}
                        {f.state !== 'pre' ? (
                          <span className="mx-2 tabular-nums text-muted">
                            {f.home.score ?? '0'}–{f.away.score ?? '0'}
                          </span>
                        ) : (
                          <span className="mx-2 text-muted">–</span>
                        )}
                        {f.away.abbreviation}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {f.home.name} vs {f.away.name}
                      </span>
                    </span>
                    <span className="hidden text-right text-[10px] uppercase tracking-[0.12em] text-muted sm:block">
                      {f.dondeVer?.us ? `US · ${f.dondeVer.us}` : 'MX ↔ US'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
