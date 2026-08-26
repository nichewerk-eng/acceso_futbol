'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useGravity } from '@/contexts/GravityContext';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { competitionBandTag, leaguePath } from '@/lib/radio/phases';
import type { DayGame } from '@/lib/sports';
import { kickHold, kickHoldLabel } from '@/lib/sports/localizeEs';

function kickLabel(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function cabinaLine(g: DayGame, tz: string) {
  if (g.phase === 'live') return { action: 'AF Radio', ready: true, note: 'En el capítulo' };
  if (g.phase === 'preshow') return { action: 'Pre-show', ready: true, note: 'Podcast previo' };
  if (g.phase === 'recap') return { action: 'Recap podcast', ready: true, note: 'Postpartido' };
  if (g.state === 'pre') {
    const hold = kickHoldLabel(kickHold(g.statusLabel));
    return {
      action: 'Cabina al inicio',
      ready: false,
      note: hold ?? `Arranca ${kickLabel(g.date, tz)}`,
    };
  }
  return { action: 'Cabina', ready: false, note: 'Sin audio aún' };
}

export function GamesOfDayBanner() {
  const { matchesGravity, club, elTri } = useGravity();
  const { payload, loading } = useGamesOfDay();
  const userTz = useDeviceTimeZone();

  const sorted = useMemo(() => {
    const games = payload?.games ?? [];
    return [...games].sort((a, b) => {
      const rank = (g: DayGame) => {
        if (g.phase === 'live') return 0;
        if (g.phase === 'preshow') return 1;
        if (g.phase === 'recap') return 2;
        if (g.state === 'pre') return 3;
        return 4;
      };
      const ag = matchesGravity(a.home.name, a.away.name, a.home.abbreviation, a.away.abbreviation)
        ? 0
        : 1;
      const bg = matchesGravity(b.home.name, b.away.name, b.home.abbreviation, b.away.abbreviation)
        ? 0
        : 1;
      if (ag !== bg) return ag - bg;
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return +new Date(a.date) - +new Date(b.date);
    });
  }, [payload, matchesGravity]);

  const openCount = sorted.filter((g) => g.radioAvailable).length;

  return (
    <section
      id="hoy"
      data-testid="section-hoy"
      className="hoy-feed border-b border-foreground/20"
      aria-label="Acceso Radio cabina"
    >
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div
          data-testid="hoy-telemetry"
          className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--hoy-line)] pb-5"
        >
          <div>
            <p className="hoy-telemetry text-[var(--hoy-paper)]">
              <span className="text-[var(--signal)]">AF</span>
              ://CABINA
            </p>
            <h2
              className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-[var(--hoy-paper)] sm:text-4xl"
              data-testid="hoy-title"
            >
              Escucha el partido
            </h2>
            <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-[var(--hoy-dim)]">
              Pre-show 15 min antes. Recap al final.
              Los marcadores viven arriba en la cancha.
            </p>
          </div>
          <p className="hoy-telemetry">
            {loading && !payload
              ? 'SYNC…'
              : openCount > 0
                ? `${openCount} al aire`
                : club || elTri
                  ? `LOCK ${(club?.abbreviation ?? '') + (elTri ? '+TRI' : '')}`
                  : 'Cabina'}
          </p>
        </div>

        {loading && sorted.length === 0 ? (
          <p className="hoy-telemetry py-8" data-testid="hoy-loading">
            Preparando cabina…
          </p>
        ) : sorted.length === 0 ? (
          <div
            className="border border-[var(--hoy-line)] px-5 py-8"
            data-testid="hoy-empty"
          >
            <p className="font-display text-xl font-bold uppercase tracking-wide text-[var(--hoy-paper)]">
              Cabina en espera
            </p>
            <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-[var(--hoy-dim)]">
              Sin partidos hoy para al aire. En ventana Leagues Cup, el tablero MX ↔ MLS está en
              el canal cup.
            </p>
            <Link href="/leagues-cup" className="hoy-cta hoy-cta-ghost mt-5 inline-flex">
              Ver Leagues Cup
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hoy-line)] border-y border-[var(--hoy-line)]" data-testid="hoy-cabina-list">
            {sorted.map((g) => {
              const path = leaguePath(g.league);
              const href = `/partido/${path}/${g.id}?tab=radio`;
              const line = cabinaLine(g, userTz);
              const compTag = competitionBandTag(g.league, g.jornada);
              const mine = matchesGravity(
                g.home.name,
                g.away.name,
                g.home.abbreviation,
                g.away.abbreviation
              );

              return (
                <li
                  key={`${g.league}-${g.id}`}
                  data-testid={`hoy-cabina-${g.id}`}
                  className="flex flex-wrap items-center gap-4 py-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="hoy-telemetry flex flex-wrap items-center gap-2 text-[var(--hoy-paper)]">
                      {g.phase === 'live' && <span className="hoy-live-dot" aria-hidden />}
                      {line.action}
                      {g.state === 'in' && (
                        <span className="text-[var(--signal)]">
                          ·{' '}
                          {g.clock === 'HT' || /descanso/i.test(g.statusLabel || '')
                            ? 'HT'
                            : g.clock || 'LIVE'}
                          {g.home.score != null && g.away.score != null
                            ? ` ${g.home.score}-${g.away.score}`
                            : ''}
                        </span>
                      )}
                      {compTag && <span className="text-[var(--signal)]">· {compTag}</span>}
                      {mine && <span className="text-[var(--signal)]">· TU CLUB</span>}
                    </p>
                    <p className="mt-1.5 font-display text-xl font-bold uppercase tracking-wide text-[var(--hoy-paper)] sm:text-2xl">
                      {g.home.name}
                      <span className="mx-2 text-[var(--hoy-dim)]">vs</span>
                      {g.away.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[var(--hoy-dim)]">{line.note}</p>
                  </div>
                  {line.ready ? (
                    <Link
                      href={href}
                      className="hoy-cta shrink-0"
                      data-testid={`hoy-play-${g.id}`}
                    >
                      ▶ Entrar
                    </Link>
                  ) : (
                    <Link
                      href={`/partido/${path}/${g.id}`}
                      className="hoy-cta hoy-cta-ghost shrink-0"
                      data-testid={`hoy-wait-${g.id}`}
                    >
                      Ficha
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
