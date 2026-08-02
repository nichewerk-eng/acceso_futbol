'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useGravity } from '@/contexts/GravityContext';
import { leaguePath } from '@/lib/radio/phases';
import { RADIO_STYLES, type RadioStyle } from '@/lib/radio/personas';
import type { DayGame, GamesOfDayPayload } from '@/lib/sports';

const STYLE_KEY = 'af-radio-style';
const STYLE_LABEL: Record<RadioStyle, string> = {
  caliente: 'Caliente',
  tactico: 'Táctico',
  puente: 'Puente',
};

function kickLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      timeZone: 'America/Mexico_City',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function cabinaLine(g: DayGame) {
  if (g.phase === 'live') return { action: 'AF Radio en vivo', ready: true, note: '~30s de retraso' };
  if (g.phase === 'preshow') return { action: 'Pre-show', ready: true, note: 'Podcast previo' };
  if (g.phase === 'recap') return { action: 'Recap podcast', ready: true, note: 'Postpartido' };
  if (g.state === 'pre') {
    return { action: 'Cabina al inicio', ready: false, note: `Arranca ${kickLabel(g.date)}` };
  }
  return { action: 'Cabina', ready: false, note: 'Sin audio aún' };
}

export function GamesOfDayBanner() {
  const { matchesGravity, club, elTri } = useGravity();
  const [payload, setPayload] = useState<GamesOfDayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [style, setStyle] = useState<RadioStyle>('caliente');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY) as RadioStyle | null;
      if (saved && RADIO_STYLES.includes(saved)) setStyle(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/games-of-day')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: GamesOfDayPayload | null) => {
          if (!cancelled) {
            setPayload(d && !('error' in d) ? d : null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    const t = setInterval(load, 25_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

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

  function pick(s: RadioStyle) {
    setStyle(s);
    try {
      localStorage.setItem(STYLE_KEY, s);
    } catch {
      /* ignore */
    }
  }

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
              Pre-show 15 min antes. Cabina en vivo con ~30s de retraso. Recap al final.
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
                  : 'Elige voz'}
          </p>
        </div>

        {/* Voice picker — cabina identity, not scores */}
        <div className="mb-8" data-testid="hoy-style-picker">
          <p className="hoy-telemetry mb-3">Canal de voz</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {RADIO_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pick(s)}
                data-testid={`hoy-style-${s}`}
                className={[
                  'border px-4 py-3 text-left transition',
                  style === s
                    ? 'border-[var(--signal)] bg-[var(--signal)] text-[var(--on-signal)]'
                    : 'border-[var(--hoy-line)] text-[var(--hoy-paper)] hover:border-[var(--hoy-paper)]',
                ].join(' ')}
              >
                <span className="block font-display text-lg font-bold uppercase tracking-wide">
                  {STYLE_LABEL[s]}
                </span>
                <span
                  className={[
                    'mt-1 block font-mono text-[10px] uppercase tracking-[0.14em]',
                    style === s ? 'text-[var(--on-signal)]/80' : 'text-[var(--hoy-dim)]',
                  ].join(' ')}
                >
                  {style === s ? 'Activo' : 'Seleccionar'}
                </span>
              </button>
            ))}
          </div>
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
            <p className="mt-2 font-mono text-[12px] text-[var(--hoy-dim)]">
              Cuando haya partidos hoy, aquí entra el audio. Voz guardada: {STYLE_LABEL[style]}.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--hoy-line)] border-y border-[var(--hoy-line)]" data-testid="hoy-cabina-list">
            {sorted.map((g) => {
              const path = leaguePath(g.league);
              const href = `/partido/${path}/${g.id}?tab=radio`;
              const line = cabinaLine(g);
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
                      {mine && <span className="text-[var(--signal)]">· TU CLUB</span>}
                    </p>
                    <p className="mt-1.5 font-display text-xl font-bold uppercase tracking-wide text-[var(--hoy-paper)] sm:text-2xl">
                      {g.home.name}
                      <span className="mx-2 text-[var(--hoy-dim)]">vs</span>
                      {g.away.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-[var(--hoy-dim)]">
                      {line.note} · {STYLE_LABEL[style]}
                    </p>
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
