'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useGravity } from '@/contexts/GravityContext';
import { leaguePath } from '@/lib/radio/phases';
import type { Story } from '@/lib/news/types';
import type { DayGame, GamesOfDayPayload } from '@/lib/sports';

type Props = {
  leadStory: Story | null;
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

function dayLabel(dayKey?: string) {
  if (!dayKey) return '';
  try {
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dayKey;
  }
}

function bandMeta(g: DayGame) {
  if (g.state === 'in') {
    return {
      kind: 'live' as const,
      stamp: g.clock ? `LIVE ${g.clock}` : 'LIVE',
      center: `${g.home.score ?? 0}:${g.away.score ?? 0}`,
    };
  }
  if (g.state === 'post') {
    return {
      kind: 'ft' as const,
      stamp: 'FT',
      center: `${g.home.score ?? 0}:${g.away.score ?? 0}`,
    };
  }
  return {
    kind: 'pre' as const,
    stamp: g.phase === 'preshow' ? 'PRE' : kickLabel(g.date),
    center: 'VS',
  };
}

export function PulseHero({ leadStory }: Props) {
  const { matchesGravity, club, elTri, settled } = useGravity();
  const [payload, setPayload] = useState<GamesOfDayPayload | null>(null);
  const [loading, setLoading] = useState(true);

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
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const games = useMemo(() => {
    const list = payload?.games ?? [];
    return [...list].sort((a, b) => {
      const ag = matchesGravity(a.home.name, a.away.name, a.home.abbreviation, a.away.abbreviation)
        ? 0
        : 1;
      const bg = matchesGravity(b.home.name, b.away.name, b.home.abbreviation, b.away.abbreviation)
        ? 0
        : 1;
      if (ag !== bg) return ag - bg;
      if (a.state === 'in' && b.state !== 'in') return -1;
      if (b.state === 'in' && a.state !== 'in') return 1;
      if (a.state === 'post' && b.state === 'pre') return -1;
      if (b.state === 'post' && a.state === 'pre') return 1;
      return +new Date(a.date) - +new Date(b.date);
    });
  }, [payload, matchesGravity]);

  const liveCount = games.filter((g) => g.state === 'in').length;
  const lock = [club?.abbreviation, elTri ? 'TRI' : null].filter(Boolean).join('+');
  const stage = games.find((g) => g.state === 'in') ?? games[0] ?? null;

  return (
    <section
      id="pulso"
      data-testid="section-hero"
      className="hero-theater border-b border-line"
      aria-label="Acceso Futbol · Marcadores"
    >
      <div className="pointer-events-none absolute inset-0 af-grain opacity-25" data-testid="hero-backdrop" />

      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        {/* Brand masthead — Acceso owns the room */}
        <header
          className="hero-mast animate-pulse-in mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5"
          data-testid="hero-brand-block"
        >
          <div>
            <p className="af-tele text-foreground" data-testid="hero-eyebrow">
              <span className="text-signal">AF</span>
              ://CANCHA
              {settled && lock ? ` · LOCK ${lock}` : ' · LIGA MX · EL TRI'}
            </p>
            <h1
              className="hero-wordmark mt-2 text-foreground"
              data-testid="hero-headline"
            >
              ACCESO
            </h1>
            <p className="af-tele mt-2 text-muted" data-testid="hero-support">
              {loading && !payload
                ? 'Sincronizando jornada…'
                : games.length > 0
                  ? `${dayLabel(payload?.dayKey)} · ${games.length} partido${games.length === 1 ? '' : 's'}${liveCount ? ` · ${liveCount} en vivo` : ''}`
                  : `${dayLabel(payload?.dayKey) || 'Hoy'} · sin partidos en cartelera`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="hero-cta-group">
            {!settled && (
              <a href="#gravedad" className="af-cta af-cta-ghost" data-testid="hero-cta-gravity">
                Elegir club
              </a>
            )}
            <a href="#hoy" className="af-cta" data-testid="hero-cta-hoy">
              Cabina
            </a>
          </div>
        </header>

        {/* Stage: one dominant live/featured match */}
        {stage && (
          <Link
            href={`/partido/${leaguePath(stage.league)}/${stage.id}`}
            data-testid="hero-stage"
            className={[
              'hero-stage group mb-1 block outline-none focus-visible:ring-2 focus-visible:ring-signal',
              stage.state === 'in' ? 'hero-stage-live' : '',
            ].join(' ')}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="af-tele flex items-center gap-2 text-foreground">
                {stage.state === 'in' && <span className="hoy-live-dot" aria-hidden />}
                {bandMeta(stage).stamp}
              </span>
              {matchesGravity(
                stage.home.name,
                stage.away.name,
                stage.home.abbreviation,
                stage.away.abbreviation
              ) && (
                <span className="af-chip text-signal" data-testid="hero-stage-lock">
                  TU CLUB
                </span>
              )}
              {stage.league === 'seleccion' && (
                <span className="af-tele text-signal">EL TRI</span>
              )}
            </div>

            <div className="hero-stage-grid">
              <div className="min-w-0 text-left">
                <div className="flex items-center gap-2.5">
                  <ClubLogo
                    abbr={stage.home.abbreviation}
                    name={stage.home.name}
                    size="lg"
                  />
                  <p className="hero-stage-abbr truncate group-hover:text-signal">
                    {stage.home.abbreviation}
                  </p>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                  {stage.home.name}
                </p>
              </div>
              <div className="hero-stage-score" data-testid="hero-stage-score">
                {bandMeta(stage).center}
              </div>
              <div className="min-w-0 text-right">
                <div className="flex items-center justify-end gap-2.5">
                  <p className="hero-stage-abbr truncate group-hover:text-signal">
                    {stage.away.abbreviation}
                  </p>
                  <ClubLogo
                    abbr={stage.away.abbreviation}
                    name={stage.away.name}
                    size="lg"
                  />
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                  {stage.away.name}
                </p>
              </div>
            </div>

            <p className="af-tele mt-4 text-muted">
              {stage.state === 'in'
                ? 'Toca para crónica + AF Radio'
                : stage.state === 'post'
                  ? 'Final · abre recap'
                  : 'Próximo · ficha y pre-show'}
            </p>
          </Link>
        )}

        {!loading && games.length === 0 && (
          <div
            className="border border-line bg-bg-2 px-5 py-10 text-center"
            data-testid="hero-empty"
          >
            <p className="font-display text-2xl font-bold uppercase tracking-wide">
              Cancha en silencio
            </p>
            <p className="af-tele mt-3 text-muted">
              Cuando arranque la jornada, los marcadores viven aquí.
            </p>
            <a href="#noticias" className="af-cta mt-6 inline-flex" data-testid="hero-cta-cable">
              Ver cable
            </a>
          </div>
        )}

        {/* Score wall — every game today */}
        {games.length > 1 && (
          <div className="hero-wall mt-1" data-testid="hero-score-wall">
            {games
              .filter((g) => g.id !== stage?.id)
              .map((g) => {
                const meta = bandMeta(g);
                const href = `/partido/${leaguePath(g.league)}/${g.id}`;
                const mine = matchesGravity(
                  g.home.name,
                  g.away.name,
                  g.home.abbreviation,
                  g.away.abbreviation
                );
                return (
                  <Link
                    key={`${g.league}-${g.id}`}
                    href={href}
                    data-testid={`hero-band-${g.id}`}
                    className={[
                      'hero-band',
                      meta.kind === 'live' ? 'hero-band-live' : '',
                      mine ? 'hero-band-mine' : '',
                    ].join(' ')}
                  >
                    <span className="af-tele hero-band-stamp">
                      {meta.kind === 'live' && <span className="hoy-live-dot mr-2" aria-hidden />}
                      {meta.stamp}
                    </span>
                    <span className="hero-band-home inline-flex items-center gap-2">
                      <ClubLogo abbr={g.home.abbreviation} name={g.home.name} size="sm" />
                      {g.home.abbreviation}
                    </span>
                    <span className="hero-band-center" data-testid={`hero-band-score-${g.id}`}>
                      {meta.center}
                    </span>
                    <span className="hero-band-away inline-flex items-center justify-end gap-2">
                      {g.away.abbreviation}
                      <ClubLogo abbr={g.away.abbreviation} name={g.away.name} size="sm" />
                    </span>
                    {mine && <span className="hero-band-lock af-tele text-signal">LOCK</span>}
                  </Link>
                );
              })}
          </div>
        )}

        {/* Cable as ticker under the cancha — not a second story column */}
        {leadStory && (
          <div
            className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-line py-4"
            data-testid="hero-cable-quote"
          >
            <p className="af-tele shrink-0 text-signal">Cable</p>
            <a
              href={leadStory.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 font-display text-sm font-semibold uppercase tracking-wide text-foreground transition hover:text-signal sm:text-base"
              data-testid="hero-cable-title"
            >
              {leadStory.title}
            </a>
            <a
              href="#noticias"
              className="af-tele shrink-0 text-muted hover:text-foreground"
              data-testid="hero-cable-more"
            >
              Más →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
