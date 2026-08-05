'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useGravity } from '@/contexts/GravityContext';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { leaguePath } from '@/lib/radio/phases';
import type { Story } from '@/lib/news/types';
import type { DayGame } from '@/lib/sports';

type Props = {
  leadStory: Story | null;
};

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

function bandMeta(g: DayGame, tz: string, upcoming?: boolean) {
  if (g.state === 'in') {
    const clock = (g.clock || '').trim();
    const isHt = clock === 'HT' || /descanso|half\s*time/i.test(g.statusLabel || '');
    const stamp = isHt
      ? 'HT'
      : clock === 'PEN' || /penal/i.test(g.statusLabel || '')
        ? 'PEN'
        : clock
          ? clock
          : 'LIVE';
    return {
      kind: 'live' as const,
      stamp,
      center: `${g.home.score ?? 0}–${g.away.score ?? 0}`,
    };
  }
  if (g.state === 'post') {
    return {
      kind: 'ft' as const,
      stamp: 'FT',
      center: `${g.home.score ?? 0}–${g.away.score ?? 0}`,
    };
  }
  return {
    kind: 'pre' as const,
    // Upcoming slate is a single day — times only; day lives in the hero header.
    stamp: upcoming
      ? kickLabel(g.date, tz)
      : g.phase === 'preshow'
        ? 'PRE'
        : kickLabel(g.date, tz),
    center: 'VS',
  };
}

export function PulseHero({ leadStory }: Props) {
  const { matchesGravity, club, elTri, settled } = useGravity();
  const { payload, loading } = useGamesOfDay();
  const [userTz, setUserTz] = useState('America/Mexico_City');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
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
  const upcoming = Boolean(payload?.upcoming);

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
              <span className="sr-only">
                {' '}
                Futbol · Liga MX, Leagues Cup y El Tri en vivo
              </span>
            </h1>
            <p className="af-tele mt-2 text-muted" data-testid="hero-support">
              {loading && !payload
                ? 'Sincronizando jornada…'
                : upcoming && games.length > 0
                  ? `${dayLabel(payload?.dayKey)} · ${games.length} partido${games.length === 1 ? '' : 's'} · próxima cartelera`
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
            <a href="#jornada" className="af-cta" data-testid="hero-cta-hoy">
              Jornada
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
                {upcoming && stage.state === 'pre' ? (
                  <span className="text-signal">PRÓXIMO · </span>
                ) : null}
                {bandMeta(stage, userTz, upcoming).stamp}
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
                <span className="af-tele hidden text-signal sm:inline">EL TRI</span>
              )}
              {stage.league === 'leagues-cup' && (
                <span className="af-tele hidden text-signal sm:inline">LEAGUES CUP</span>
              )}
            </div>

            <div className="hero-stage-grid">
              <div className="hero-stage-side hero-stage-home">
                <div className="hero-stage-pair">
                  <ClubLogo
                    abbr={stage.home.abbreviation}
                    clubId={stage.home.id}
                    name={stage.home.name}
                    logoUrl={stage.home.logo}
                    size="lg"
                    className="hero-stage-crest"
                  />
                  <p className="hero-stage-abbr group-hover:text-signal">
                    {stage.home.abbreviation}
                  </p>
                </div>
                <p className="hero-stage-name">{stage.home.name}</p>
              </div>
              <div className="hero-stage-score" data-testid="hero-stage-score">
                {bandMeta(stage, userTz, upcoming).center}
              </div>
              <div className="hero-stage-side hero-stage-away">
                <div className="hero-stage-pair">
                  <ClubLogo
                    abbr={stage.away.abbreviation}
                    clubId={stage.away.id}
                    name={stage.away.name}
                    logoUrl={stage.away.logo}
                    size="lg"
                    className="hero-stage-crest"
                  />
                  <p className="hero-stage-abbr group-hover:text-signal">
                    {stage.away.abbreviation}
                  </p>
                </div>
                <p className="hero-stage-name">{stage.away.name}</p>
              </div>
            </div>

            <p className="af-tele mt-4 text-muted">
              {stage.state === 'in'
                ? 'Toca para crónica'
                : stage.state === 'post'
                  ? 'Final · abre recap'
                  : upcoming
                    ? 'Próximo en cartelera · ficha'
                    : 'Próximo · ficha'}
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
              Sin partidos próximos en Liga MX o Leagues Cup.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/leagues-cup" className="af-cta inline-flex" data-testid="hero-cta-cup">
                Leagues Cup
              </Link>
              <a href="#noticias" className="af-cta af-cta-ghost inline-flex" data-testid="hero-cta-cable">
                Ver cable
              </a>
            </div>
          </div>
        )}

        {/* Score wall — every game today / upcoming slate */}
        {games.length > 1 && (
          <div className="hero-wall mt-1" data-testid="hero-score-wall">
            {games
              .filter((g) => g.id !== stage?.id)
              .map((g) => {
                const meta = bandMeta(g, userTz, upcoming);
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
                      <ClubLogo
                        abbr={g.home.abbreviation}
                        clubId={g.home.id}
                        name={g.home.name}
                        logoUrl={g.home.logo}
                        size="sm"
                      />
                      {g.home.abbreviation}
                    </span>
                    <span
                      className={[
                        'hero-band-center',
                        meta.kind === 'pre' ? 'hero-band-center-vs' : 'hero-band-center-score',
                      ].join(' ')}
                      data-testid={`hero-band-score-${g.id}`}
                    >
                      {meta.center}
                      {g.league === 'leagues-cup' ? (
                        <span className="af-tele hidden text-signal sm:inline"> · CUP</span>
                      ) : null}
                    </span>
                    <span className="hero-band-away inline-flex items-center justify-end gap-2">
                      {g.away.abbreviation}
                      <ClubLogo
                        abbr={g.away.abbreviation}
                        clubId={g.away.id}
                        name={g.away.name}
                        logoUrl={g.away.logo}
                        size="sm"
                      />
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
