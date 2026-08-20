'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { EL_TRI, LIGA_MX_CLUBS, useGravity } from '@/contexts/GravityContext';

export function GravityClaim() {
  const router = useRouter();
  const { clubId, elTri, setClub, setElTri, skip } = useGravity();

  return (
    <section
      id="gravedad"
      data-testid="section-gravity"
      className="af-ink border-b border-foreground/20 px-4 py-12 sm:px-6"
    >
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="af-tele text-[#f6f5f2]">
              <span className="text-signal">AF</span>
              ://GRAVEDAD
            </p>
            <h2
              className="mt-3 font-display text-3xl font-bold uppercase tracking-wide text-[#f6f5f2] sm:text-4xl"
              data-testid="gravity-title"
            >
              ¿De quién eres?
            </h2>
            <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-white/45">
              Un tap. Hoy, noticias y radio se alinean a tu club y a El Tri.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={skip}
              data-testid="gravity-skip"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal transition hover:text-[#f6f5f2]"
            >
              Ahora no
            </button>
            <Link
              href="/club"
              data-testid="gravity-clubes"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45 transition hover:text-[#f6f5f2]"
            >
              Ver salas →
            </Link>
          </div>
        </div>

        <div className="af-club-pad" data-testid="gravity-club-pad">
          {LIGA_MX_CLUBS.map((c) => {
            const active = clubId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setClub(c.id);
                  router.push(`/club/${c.id}`);
                }}
                data-testid={`gravity-club-${c.id}`}
                className={['af-club-btn', active ? 'is-on' : ''].join(' ')}
                aria-pressed={active}
              >
                <ClubLogo clubId={c.id} abbr={c.abbreviation} name={c.name} size="md" />
                <span>{c.abbreviation}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setElTri(true);
            router.push('/club/el-tri');
          }}
          data-testid="gravity-el-tri"
          className={[
            'mt-4 inline-flex items-center gap-2.5 border px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition',
            elTri
              ? 'border-signal bg-signal text-on-signal'
              : 'border-signal/40 text-[#f6f5f2] hover:border-signal hover:text-signal',
          ].join(' ')}
          aria-pressed={elTri}
        >
          <ClubLogo clubId={EL_TRI.id} abbr={EL_TRI.abbreviation} name={EL_TRI.name} size="md" />
          {EL_TRI.name} · TRI
        </button>
      </div>
    </section>
  );
}
