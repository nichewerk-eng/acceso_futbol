'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useGravity } from '@/contexts/GravityContext';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { competitionBandTag, leaguePath, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import type { Story } from '@/lib/news/types';
import type { DayGame } from '@/lib/sports';

function showDondeVer(g: Pick<DayGame, 'state' | 'dondeVer'>) {
  if (g.state === 'post') return false;
  const d = g.dondeVer;
  if (!d) return false;
  return Boolean(
    d.mxChannels?.length || d.usChannels?.length || d.mx || d.us
  );
}

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

function formatSlateDate(dayKey: string) {
  try {
    const [y, m, d] = dayKey.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dayKey;
  }
}

/** Hoy / Mañana / weekday — never imply today when the slate rolled forward. */
function slateHeadline(dayKey: string | undefined, upcoming: boolean, todayKey: string) {
  if (!dayKey) return upcoming ? 'Próxima cartelera' : 'Hoy';
  const dated = formatSlateDate(dayKey);
  if (dayKey === todayKey) return `Hoy · ${dated}`;
  if (dayKey === shiftDayKey(todayKey, 1)) return `Mañana · ${dated}`;
  return dated;
}

function bandMeta(
  g: DayGame,
  tz: string,
  upcoming: boolean,
  dayKey: string | undefined,
  todayKey: string
) {
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
      stageStamp: stamp,
      center: `${g.home.score ?? 0}–${g.away.score ?? 0}`,
    };
  }
  if (g.state === 'post') {
    return {
      kind: 'ft' as const,
      stamp: 'FT',
      stageStamp: 'FT',
      center: `${g.home.score ?? 0}–${g.away.score ?? 0}`,
    };
  }

  const time = kickLabel(g.date, tz);
  let stamp = time;
  if (upcoming && dayKey) {
    // Stage uses a MAÑANA/PRÓXIMO kicker; wall rows need the day on the stamp.
    if (dayKey === shiftDayKey(todayKey, 1)) {
      stamp = time ? `Mañana · ${time}` : 'Mañana';
    } else if (dayKey !== todayKey) {
      try {
        const [y, m, d] = dayKey.split('-').map(Number);
        const short = new Date(y!, m! - 1, d!).toLocaleDateString('es-MX', {
          weekday: 'short',
          day: 'numeric',
        });
        stamp = time ? `${short} · ${time}` : short;
      } catch {
        stamp = time;
      }
    }
  }

  return {
    kind: 'pre' as const,
    stamp,
    /** Time-only for featured stage (day lives in the MAÑANA/PRÓXIMO kicker). */
    stageStamp: time || stamp,
    center: 'VS',
  };
}

export function PulseHero({ leadStory }: Props) {
  const { matchesGravity } = useGravity();
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
  const stage = games.find((g) => g.state === 'in') ?? games[0] ?? null;
  const stageTag = stage ? competitionBandTag(stage.league, stage.jornada) : null;
  const upcoming = Boolean(payload?.upcoming);
  const todayKey = mexicoDayKey();
  const slateKey = payload?.dayKey;
  const headline = slateHeadline(slateKey, upcoming, todayKey);
  const stageMeta = stage ? bandMeta(stage, userTz, upcoming, slateKey, todayKey) : null;

  return (
    <section
      id="pulso"
      data-testid="section-hero"
      className="hero-theater border-b border-line"
      aria-label="Acceso Futbol · Marcadores"
    >
      <div className="pointer-events-none absolute inset-0 af-grain opacity-25" data-testid="hero-backdrop" />

      <div className="relative mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-6">
        <p className="hero-ident af-tele mb-5 text-muted" data-testid="hero-support">
          {loading && !payload
            ? 'Sincronizando jornada…'
            : upcoming && games.length > 0
              ? `${headline} · ${games.length} partido${games.length === 1 ? '' : 's'} · no hay cartelera hoy`
              : games.length > 0
                ? `${headline} · ${games.length} partido${games.length === 1 ? '' : 's'}${liveCount ? ` · ${liveCount} en vivo` : ''}`
                : `${headline} · sin partidos en cartelera`}
        </p>

        {/* Stage: one dominant live/featured match */}
        {stage && stageMeta && (
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
                  <span className="text-signal">
                    {slateKey === shiftDayKey(todayKey, 1) ? 'MAÑANA' : 'PRÓXIMO'}
                    {' · '}
                  </span>
                ) : null}
                {stageMeta.kind === 'pre' ? stageMeta.stageStamp : stageMeta.stamp}
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
              {stageTag ? (
                <span className="af-tele hidden text-signal sm:inline">{stageTag}</span>
              ) : null}
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
                {stageMeta.center}
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

            <div className="hero-stage-foot mt-4">
              <p className="af-tele text-muted">
                {stage.state === 'in'
                  ? 'Toca para crónica'
                  : stage.state === 'post'
                    ? 'Final · abre recap'
                    : upcoming
                      ? 'Próximo en cartelera · ficha'
                      : 'Próximo · ficha'}
              </p>
              {showDondeVer(stage) ? (
                <BroadcastChannels
                  className="hero-stage-tv tv-inline-desk"
                  mx={stage.dondeVer?.mxChannels}
                  us={stage.dondeVer?.usChannels}
                  mxLabel={stage.dondeVer?.mx}
                  usLabel={stage.dondeVer?.us}
                  compact
                  inline
                />
              ) : null}
            </div>
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
                Ver noticias
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
                const meta = bandMeta(g, userTz, upcoming, slateKey, todayKey);
                const href = `/partido/${leaguePath(g.league)}/${g.id}`;
                const compTag = competitionBandTag(g.league, g.jornada);
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
                      meta.kind === 'ft' ? 'hero-band-ft' : '',
                      mine ? 'hero-band-mine' : '',
                    ].join(' ')}
                  >
                    {meta.kind !== 'ft' ? (
                      <span className="af-tele hero-band-stamp">
                        {meta.kind === 'live' && <span className="hoy-live-dot mr-2" aria-hidden />}
                        {meta.stamp}
                      </span>
                    ) : null}
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
                      {meta.kind === 'ft' ? (
                        <span className="hero-band-center-ft">
                          <span className="lc-match-score-n">{g.home.score ?? 0}</span>
                          <span className="lc-match-ft">-FT-</span>
                          <span className="lc-match-score-n">{g.away.score ?? 0}</span>
                        </span>
                      ) : (
                        <span className="hero-band-center-mark">{meta.center}</span>
                      )}
                      {compTag ? (
                        <span className="af-tele hero-band-center-tag hidden text-signal sm:block">
                          {compTag}
                        </span>
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
                    {showDondeVer(g) ? (
                      <span className="hero-band-tv">
                        <BroadcastChannels
                          className="tv-inline-desk"
                          mx={g.dondeVer?.mxChannels}
                          us={g.dondeVer?.usChannels}
                          mxLabel={g.dondeVer?.mx}
                          usLabel={g.dondeVer?.us}
                          compact
                          inline
                        />
                      </span>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        )}

        {/* News as ticker under the cancha — not a second story column */}
        {leadStory && (
          <div
            className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-line py-4"
            data-testid="hero-cable-quote"
          >
            <p className="af-tele shrink-0 text-signal">News</p>
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
