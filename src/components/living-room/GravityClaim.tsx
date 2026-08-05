'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { EL_TRI, LIGA_MX_CLUBS, useGravity } from '@/contexts/GravityContext';

export function GravityClaim() {
  const router = useRouter();
  const { settled, clubId, elTri, setClub, setElTri, skip, club, reset } = useGravity();

  // Compact lock strip once settled
  if (settled) {
    const lock = [club?.abbreviation, elTri ? 'TRI' : null].filter(Boolean).join(' + ');
    if (!lock) return null;
    const salaHref = club ? `/club/${club.id}` : elTri ? '/club/el-tri' : null;
    return (
      <section
        id="gravedad"
        data-testid="section-gravity-locked"
        className="border-b border-line bg-bg-2 px-4 py-3 sm:px-6"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="af-tele text-foreground" data-testid="gravity-lock-label">
            <span className="text-signal">LOCK</span> {lock}
            <span className="ml-3 text-muted">El pulso se ordena alrededor de ti</span>
          </p>
          <div className="flex items-center gap-4">
            {salaHref && (
              <Link
                href={salaHref}
                data-testid="gravity-open-sala"
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal transition hover:text-foreground"
              >
                Abrir sala
              </Link>
            )}
            <button
              type="button"
              onClick={reset}
              data-testid="gravity-reset"
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-foreground"
            >
              Cambiar
            </button>
          </div>
        </div>
      </section>
    );
  }

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
              Un tap. Hoy, cable y radio se alinean a tu club y a El Tri.
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            data-testid="gravity-skip"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 transition hover:text-[#f6f5f2]"
          >
            Ahora no
          </button>
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
              : 'border-white/20 text-[#f6f5f2] hover:border-[#f6f5f2]',
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
