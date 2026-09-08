'use client';

import Link from 'next/link';
import { type CSSProperties } from 'react';
import { DondeVerGuide } from '@/components/living-room/DondeVerGuide';
import { JornadaTakeBoard } from '@/components/living-room/JornadaTake';
import { OnceRoom } from '@/components/living-room/OnceRoom';
import { SelladoFromFixture } from '@/components/match/SelladoCard';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import { useTomaTake } from '@/lib/client/useTomaTake';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { buildJornadaTake, mergeJornadaTake } from '@/lib/sports/jornadaTake';

export function JornadaRecap() {
  const { payload: data, loading } = useJornadaOverview();
  const userTz = useDeviceTimeZone();

  const { remote, pending } = useTomaTake(data, Boolean(data));

  if (!loading && !data) return null;

  const played = data?.played ?? [];
  const live = data?.live ?? [];
  const upcoming = data?.upcoming ?? [];
  const postponed = data?.postponed ?? [];
  const filledCount = live.length + played.length;
  const total = filledCount + upcoming.length || 9;
  const doneCount = played.length;
  const jornadaNum = data?.number;
  const fechaCerrada =
    !loading &&
    Boolean(data) &&
    live.length === 0 &&
    upcoming.length === 0 &&
    postponed.length === 0 &&
    played.length > 0;

  const local = data ? buildJornadaTake(data) : null;
  const take = local && remote ? mergeJornadaTake(local, remote) : local;

  return (
    <section
      id="jornada"
      data-testid="section-jornada"
      className="jor-board border-b border-line bg-bg-1 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        {take || pending ? (
          <div className="mb-10">
            <JornadaTakeBoard take={take} pending={pending} />
          </div>
        ) : null}

        <div className="mb-10 grid gap-6 border-b border-line pb-8 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-10">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>
              ://JORNADA
            </p>
            <p
              className="jor-num mt-1"
              data-testid="jornada-title"
              aria-label={data?.label ?? 'Jornada'}
            >
              {loading && !data ? '—' : jornadaNum ?? '—'}
            </p>
          </div>

          <div className="min-w-0 lg:pb-2">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
                {loading && !data ? 'Cargando fecha…' : 'Estado de la fecha'}
              </p>
              <p className="af-tele" data-testid="jornada-stats">
                {loading && !data
                  ? 'SYNC…'
                  : [
                      `${doneCount} jugados`,
                      live.length ? `${live.length} en vivo` : '',
                      upcoming.length ? `${upcoming.length} quedan` : '',
                      postponed.length ? `${postponed.length} aplazados` : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </p>
            </div>
            <div
              className="jor-track"
              style={{ '--jor-total': total } as CSSProperties}
              data-testid="jornada-track"
              aria-hidden
            >
              {Array.from({ length: total }, (_, i) => {
                const liveIdx = live.length;
                const cls =
                  i < liveIdx
                    ? 'is-live'
                    : i < filledCount
                      ? 'is-done'
                      : i === filledCount
                        ? 'is-next'
                        : '';
                return <span key={i} className={['jor-track-cell', cls].filter(Boolean).join(' ')} />;
              })}
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              {fechaCerrada
                ? 'Fecha sellada. Esperando la siguiente jornada.'
                : postponed.length
                  ? `${postponed.length} de la fecha están aplazados. Quedan ${upcoming.length} en la cartelera de este fin.`
                  : 'Resultados sellados y lo que todavía falta por patear.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 self-end">
            <Link href="/club/el-tri" className="af-cta !py-2" data-testid="jornada-cta-el-tri">
              El Tri
            </Link>
            <Link
              href="/liga-mx"
              className="af-cta af-cta-ghost !py-2"
              data-testid="jornada-cta-tabla"
            >
              Calendario
            </Link>
          </div>
        </div>

        {loading && !data ? (
          <p className="af-tele py-8" data-testid="jornada-loading">
            Cargando jornada…
          </p>
        ) : (
          <div className="space-y-12" data-testid="jornada-columns">
            {(live.length > 0 || upcoming.length > 0 || postponed.length > 0) && (
              <DondeVerGuide
                jornadaNum={jornadaNum}
                live={live}
                upcoming={upcoming}
                postponed={postponed}
                tz={userTz}
              />
            )}

            {played.length > 0 && (
              <div data-testid="jornada-played">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-bold uppercase tracking-wide">
                    Sellados
                  </h3>
                  <p className="af-tele">{played.length}</p>
                </div>
                <div className="jor-mosaic">
                  {played.map((f) => (
                    <SelladoFromFixture
                      key={f.id}
                      f={f}
                      href={`/partido/liga-mx/${f.id}`}
                      testId={`jornada-match-${f.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <OnceRoom />
          </div>
        )}
      </div>
    </section>
  );
}
