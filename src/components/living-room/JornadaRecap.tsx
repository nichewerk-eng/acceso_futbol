'use client';

import Link from 'next/link';
import { type CSSProperties } from 'react';
import { DondeVerGuide } from '@/components/living-room/DondeVerGuide';
import { JornadaTakeBoard } from '@/components/living-room/JornadaTake';
import { OnceRoom } from '@/components/living-room/OnceRoom';
import { SelladoFromFixture } from '@/components/match/SelladoCard';
import { isLeaguesCupWindow } from '@/config/leaguesCup2026';
import { useJornadaOverview } from '@/lib/client/useJornadaOverview';
import { useTomaTake } from '@/lib/client/useTomaTake';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { buildJornadaTake, mergeJornadaTake } from '@/lib/sports/jornadaTake';

export function JornadaRecap() {
  const { payload: data, loading } = useJornadaOverview();
  const userTz = useDeviceTimeZone();

  const lcPause =
    data != null &&
    data.upcoming.length === 0 &&
    data.live.length + data.played.length > 0 &&
    isLeaguesCupWindow();
  const { remote, pending } = useTomaTake(data, Boolean(data) && !lcPause);

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

  const local = data && !lcPause ? buildJornadaTake(data) : null;
  const take = local && remote ? mergeJornadaTake(local, remote) : local;

  return (
    <section
      id="jornada"
      data-testid="section-jornada"
      className="jor-board border-b border-line bg-bg-1 px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-6xl">
        {!lcPause && (take || pending) ? (
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
                {loading && !data
                  ? 'Cargando fecha…'
                  : lcPause
                    ? 'Fecha cerrada · pausa LC'
                    : 'Estado de la fecha'}
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
              {lcPause
                ? 'Liga MX en pausa por Leagues Cup. La siguiente jornada vuelve cuando cierre el torneo binacional.'
                : fechaCerrada
                  ? 'Fecha sellada. Esperando la siguiente jornada.'
                  : postponed.length
                    ? `${postponed.length} de la fecha se aplazaron por Leagues Cup. Quedan ${upcoming.length} en la cartelera de este fin.`
                    : 'Resultados sellados y lo que todavía falta por patear.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 self-end">
            {lcPause && (
              <Link href="/leagues-cup" className="af-cta !py-2" data-testid="jornada-cta-lc">
                Leagues Cup
              </Link>
            )}
            <Link
              href="/liga-mx"
              className="af-cta af-cta-ghost !py-2"
              data-testid="jornada-cta-tabla"
            >
              Calendario
            </Link>
          </div>
        </div>

        {lcPause && (
          <div
            data-testid="jornada-lc-pause"
            className="mb-10 border border-signal/40 bg-signal/[0.06] px-4 py-5 sm:px-5"
            role="status"
          >
            <p className="af-tele text-signal">AF://PAUSA · LEAGUES CUP</p>
            <p className="mt-2 font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
              Liga MX en espera
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              El Apertura frenó durante Leagues Cup Fase 1 (4–13 ago). El pulso doméstico vuelve con
              la siguiente jornada.
            </p>
            <Link href="/leagues-cup" className="af-cta mt-4 inline-flex !py-2">
              Ir a Leagues Cup
            </Link>
          </div>
        )}

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

            {!lcPause ? <OnceRoom /> : null}
          </div>
        )}
      </div>
    </section>
  );
}
