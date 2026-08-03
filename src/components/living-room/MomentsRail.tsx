'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MOMENTS } from '@/config/moments';
import { useGravity } from '@/contexts/GravityContext';

export function MomentsRail() {
  const { clubId } = useGravity();

  const sorted = [...MOMENTS].sort((a, b) => {
    const ac = a.cable ? 0 : 1;
    const bc = b.cable ? 0 : 1;
    if (ac !== bc) return ac - bc;
    const ah = a.clubIds?.includes(clubId ?? '') ? 0 : 1;
    const bh = b.clubIds?.includes(clubId ?? '') ? 0 : 1;
    if (ah !== bh) return ah - bh;
    const at = a.publishedAt ? +new Date(a.publishedAt) : 0;
    const bt = b.publishedAt ? +new Date(b.publishedAt) : 0;
    return bt - at;
  });

  const [lead, ...rest] = sorted;

  return (
    <section
      id="momentos"
      data-testid="section-momentos"
      className="border-b border-line px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>
              ://TOMA
            </p>
            <h2
              className="mt-2 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl"
              data-testid="momentos-title"
            >
              Momentos Acceso
            </h2>
          </div>
          <p className="af-tele">Opinión · Rivalidad · Femenil · Radio</p>
        </div>

        {lead && (
          <article
            data-testid={`momento-lead-${lead.id}`}
            className="group relative mb-2 grid overflow-hidden border border-line bg-bg-2 lg:grid-cols-2"
          >
            {lead.image ? (
              <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px]">
                <Image
                  src={lead.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 560px"
                />
                <div className="absolute inset-0 bg-foreground/10" />
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center bg-bg-3 af-tele">
                TOMA
              </div>
            )}
            <div className="flex flex-col justify-center px-5 py-8 sm:px-8">
              {lead.tag && (
                <p className="af-chip inline-flex w-fit text-signal">{lead.tag}</p>
              )}
              <h3 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.02] tracking-wide sm:text-4xl">
                {lead.headline}
              </h3>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted">{lead.body}</p>
              <Link
                href={`/momento/${lead.id}`}
                className="af-cta mt-6 w-fit"
                data-testid={`momento-cta-${lead.id}`}
              >
                Leer momento
              </Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <div className="hoy-rail -mx-4 border border-line sm:-mx-0 sm:mx-0" data-testid="momentos-rail">
            {rest.map((m) => (
              <article
                key={m.id}
                data-testid={`momento-card-${m.id}`}
                className="hoy-frame !border-[var(--line)] !text-foreground"
                style={{ background: 'var(--bg-2)' }}
              >
                <p className="af-tele text-signal">{m.tag ?? 'Acceso'}</p>
                <h3 className="mt-3 font-display text-xl font-bold uppercase leading-snug tracking-wide">
                  {m.headline}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{m.body}</p>
                <Link
                  href={`/momento/${m.id}`}
                  className="mt-5 inline-flex font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground hover:text-signal"
                >
                  Abrir →
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
