'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { ClubPulseWall } from '@/components/club/ClubPulseWall';
import { LiguillaPathShare } from '@/components/ligamx/LiguillaPathShare';
import { useGravity } from '@/contexts/GravityContext';
import type { ClubBoard } from '@/lib/sports/clubBoard';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { Fixture } from '@/lib/sports/types';

function kickWhen(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function resultForClub(f: Fixture, clubAbbr: string): 'W' | 'D' | 'L' | null {
  if (f.state !== 'post') return null;
  const hs = Number(f.home.score);
  const as = Number(f.away.score);
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
  const homeIsMine = scheduleAbbr(f.home.abbreviation) === scheduleAbbr(clubAbbr);
  if (hs === as) return 'D';
  return (homeIsMine ? hs > as : as > hs) ? 'W' : 'L';
}

function partidoHref(f: Fixture) {
  return `/partido/${f.league}/${f.id}`;
}

function scorerLine(f: Fixture): string {
  const list = f.scorers ?? [];
  if (list.length === 0) {
    const hs = Number(f.home.score ?? 0);
    const as = Number(f.away.score ?? 0);
    if (f.state === 'post' && hs === 0 && as === 0) return '0-0';
    return '';
  }
  const parts = list.map((s) => {
    const tag = s.pen ? ' (P)' : s.og ? ' (OG)' : '';
    return `${s.name}${s.minute ? ` ${s.minute}` : ''}${tag}`;
  });
  if (parts.length <= 3) return parts.join(' · ');
  return `${parts.slice(0, 2).join(' · ')} · +${parts.length - 2}`;
}

function ClubTapeStamp({
  f,
  clubAbbr,
}: {
  f: Fixture;
  clubAbbr: string;
}) {
  const live = f.state === 'in';
  const winner = f.winnerSide ?? null;
  const draw = !live && winner === null && f.state === 'post';
  const homeCls =
    winner === 'home'
      ? 'jor-team-win is-win'
      : winner === 'away'
        ? 'jor-team-lose is-lose'
        : draw
          ? 'jor-team-draw'
          : '';
  const awayCls =
    winner === 'away'
      ? 'jor-team-win is-win'
      : winner === 'home'
        ? 'jor-team-lose is-lose'
        : draw
          ? 'jor-team-draw'
          : '';
  const chip = resultForClub(f, clubAbbr);
  const scorers = scorerLine(f);

  return (
    <Link
      href={partidoHref(f)}
      data-testid={`club-recent-${f.id}`}
      className={['jor-stamp jor-rise', live ? 'jor-stamp-live' : ''].join(' ')}
    >
      <div className="jor-stamp-meta">
        {live && <span className="hoy-live-dot" aria-hidden />}
        <span>
          {live
            ? f.clock === 'HT' || /descanso/i.test(f.statusLabel || '')
              ? 'HT'
              : f.clock || 'LIVE'
            : 'FT'}
        </span>
        {chip && <span aria-hidden>· {chip}</span>}
      </div>
      <div>
        <p className="jor-stamp-score">
          <span className={homeCls}>{f.home.score ?? 0}</span>
          <span className="mx-1 opacity-35">:</span>
          <span className={awayCls}>{f.away.score ?? 0}</span>
        </p>
        <div className="jor-stamp-teams">
          <span className={['jor-stamp-home inline-flex items-center gap-2', homeCls].join(' ')}>
            <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
            <span className="club-word club-word-sm">{f.home.abbreviation}</span>
          </span>
          <span
            className={['jor-stamp-away inline-flex items-center justify-end gap-2', awayCls].join(
              ' '
            )}
          >
            <span className="club-word club-word-sm">{f.away.abbreviation}</span>
            <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
          </span>
        </div>
        {scorers ? (
          <p className="jor-stamp-scorers" title={scorers}>
            {scorers}
          </p>
        ) : (
          <p className="jor-stamp-scorers">&nbsp;</p>
        )}
      </div>
    </Link>
  );
}

function ClubTapeNext({ f, tz }: { f: Fixture; tz: string }) {
  return (
    <Link
      href={partidoHref(f)}
      data-testid={`club-upcoming-${f.id}`}
      className="jor-next jor-rise"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="jor-next-when">{kickWhen(f.date, tz)}</p>
      </div>
      <div className="jor-next-vs">
        <span className="jor-next-side jor-next-home">
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="sm" />
          <span className="jor-next-abbr">{f.home.abbreviation}</span>
        </span>
        <span className="jor-next-mid">VS</span>
        <span className="jor-next-side jor-next-away">
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="sm" />
          <span className="jor-next-abbr">{f.away.abbreviation}</span>
        </span>
      </div>
      <p className="jor-next-when jor-next-cta">Ficha del partido</p>
    </Link>
  );
}

export function ClubSala({ initialBoard }: { initialBoard: ClubBoard }) {
  const board = initialBoard;
  const { clubId, setClub, setElTri, settled, elTri } = useGravity();
  const [tz, setTz] = useState('America/Mexico_City');
  const isMine =
    settled &&
    (clubId === board.club.id || (board.club.id === 'el-tri' && elTri));

  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City');
    } catch {
      /* keep default */
    }
  }, []);

  const { club, next, live, table, liguilla, form, recent, upcoming, accesoLine } = board;
  const style = {
    ['--club-ink' as string]: club.palette.ink,
    ['--club-signal' as string]: club.palette.signal,
    ['--club-on-ink' as string]: club.palette.onInk,
  };

  function claimClub() {
    if (club.id === 'el-tri') {
      setElTri(true);
    } else {
      setClub(club.id);
    }
  }

  return (
    <div className="club-sala" style={style} data-testid="club-sala" data-club={club.id}>
      {/* Hero — one composition */}
      <section className="club-hero" data-testid="club-hero">
        <div className="club-hero-scan" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="af-tele club-tele animate-pulse-in">
            <span className="text-[var(--club-signal)]">AF</span>
            ://CLUB/{club.abbreviation}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-5 sm:gap-8">
            <div className="club-crest-wrap animate-pulse-in">
              <ClubLogo
                clubId={club.id}
                abbr={club.abbreviation}
                name={club.name}
                size="xl"
                className="club-crest"
              />
            </div>
            <div className="min-w-0 flex-1 animate-pulse-in-delay">
              <h1
                className="font-display text-4xl font-bold uppercase leading-[0.95] tracking-wide sm:text-6xl md:text-7xl"
                data-testid="club-name"
              >
                {club.name}
              </h1>
              <p
                className="mt-4 max-w-xl font-mono text-[13px] leading-6 text-[color:color-mix(in_srgb,var(--club-on-ink)_70%,transparent)]"
                data-testid="club-acceso-line"
              >
                {accesoLine}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 animate-pulse-in-delay-2">
            {table && (
              <p className="af-tele club-tele" data-testid="club-table-chip">
                #{table.position} · {table.pts} PTS · {table.gp} PJ
                {form.length > 0 && (
                  <span className="ml-3 tracking-[0.2em]">
                    {form.map((m) => m.result).join('')}
                  </span>
                )}
              </p>
            )}
            {!table && form.length > 0 && (
              <p className="af-tele club-tele">
                FORMA {form.map((m) => m.result).join('')}
              </p>
            )}

            {(!settled || clubId !== club.id) && club.id !== 'el-tri' && (
              <button
                type="button"
                onClick={claimClub}
                className="club-claim-btn"
                data-testid="club-claim"
              >
                Este es mi club
              </button>
            )}
            {club.id === 'el-tri' && (
              <button
                type="button"
                onClick={claimClub}
                className="club-claim-btn"
                data-testid="club-claim-tri"
              >
                Lock El Tri
              </button>
            )}
            {isMine && clubId === club.id && (
              <span className="af-tele text-[var(--club-signal)]">LOCK ACTIVO</span>
            )}
          </div>
        </div>
      </section>

      {/* Next match + dónde ver */}
      <section
        className="border-b border-line bg-bg-2 px-4 py-8 sm:px-6"
        data-testid="club-next"
      >
        <div className="mx-auto max-w-6xl">
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>://PRÓXIMO
          </p>
          {next ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  {next.state === 'in' ? (
                    <span className="text-signal">EN VIVO · {next.clock || next.statusLabel}</span>
                  ) : (
                    kickWhen(next.date, tz)
                  )}
                  {next.jornada ? ` · ${next.jornada}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <ClubLogo
                    abbr={next.home.abbreviation}
                    name={next.home.name}
                    size="lg"
                  />
                  <p className="club-word club-word-lg">
                    {next.home.abbreviation}
                    <span className="mx-2 text-muted">
                      {next.state === 'pre'
                        ? 'vs'
                        : `${next.home.score ?? '-'}–${next.away.score ?? '-'}`}
                    </span>
                    {next.away.abbreviation}
                  </p>
                  <ClubLogo
                    abbr={next.away.abbreviation}
                    name={next.away.name}
                    size="lg"
                  />
                </div>
                {(next.venue || next.city) && (
                  <p className="mt-2 font-mono text-[11px] text-muted">
                    {[next.venue, next.city].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="mt-4">
                  <BroadcastChannels
                    mx={next.dondeVer?.mxChannels}
                    us={next.dondeVer?.usChannels}
                    mxLabel={next.dondeVer?.mx}
                    usLabel={next.dondeVer?.us}
                    surface="paper"
                  />
                </div>
              </div>
              <Link
                href={partidoHref(next)}
                className="af-cta inline-flex justify-center self-start lg:self-end"
                data-testid="club-next-cta"
              >
                {next.state === 'in' ? 'Entrar al capítulo' : 'Ver partido'}
              </Link>
            </div>
          ) : (
            <p className="mt-4 max-w-lg font-mono text-[13px] leading-6 text-muted">
              {club.weatherLine} Sin silbato en el calendario inmediato — las noticias y la grada
              siguen abajo.
            </p>
          )}
        </div>
      </section>

      {liguilla && (
        <section
          className="border-b border-line bg-bg-1 px-4 py-8 sm:px-6"
          data-testid="club-liguilla"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="af-tele text-foreground">
                <span className="text-signal">AF</span>
                ://LIGUILLA
              </p>
              <LiguillaPathShare abbr={club.abbreviation} path={liguilla} />
            </div>
            <p
              className="mt-3 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl"
              data-testid="club-liguilla-headline"
            >
              {liguilla.headline}
            </p>
            <p className="mt-2 max-w-xl font-mono text-[13px] leading-6 text-muted">
              {liguilla.detail}
            </p>
            <Link
              href="/liga-mx"
              className="mt-4 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal hover:text-foreground"
            >
              Ver tabla
            </Link>
          </div>
        </section>
      )}

      {/* Results tape — above the content pulse */}
      <section
        className="club-tape border-b border-line bg-bg-1 px-4 py-10 sm:px-6"
        data-testid="club-tape"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="af-tele text-foreground">
                <span className="text-signal">AF</span>://CINTA
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                Partidos
              </h2>
            </div>
            {(form.length > 0 || recent.length > 0) && (
              <p className="club-form-strip" data-testid="club-form-strip" aria-label="Forma reciente">
                {(form.length > 0
                  ? form.map((m) => m.result)
                  : recent.map((f) => resultForClub(f, club.abbreviation)).filter(Boolean)
                ).map((r, i) => (
                  <span key={`${r}-${i}`} className={`club-form-cell is-${String(r).toLowerCase()}`}>
                    {r}
                  </span>
                ))}
              </p>
            )}
          </div>

          {recent.length > 0 && (
            <div className="mt-8" data-testid="club-recent">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Recientes
              </p>
              <div className="jor-mosaic mt-3">
                {recent.map((f) => (
                  <ClubTapeStamp key={f.id} f={f} clubAbbr={club.abbreviation} />
                ))}
              </div>
            </div>
          )}

          {(upcoming.length > 0 || (next && next.state === 'pre' && upcoming.length === 0)) && (
            <div className="mt-10" data-testid="club-upcoming">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Próximos
              </p>
              <div className="jor-mosaic mt-3">
                {(upcoming.length > 0 ? upcoming : next ? [next] : []).map((f) => (
                  <ClubTapeNext key={`up-${f.id}`} f={f} tz={tz} />
                ))}
              </div>
            </div>
          )}

          {live && (
            <p className="mt-6 af-tele text-signal" data-testid="club-live-note">
              EN VIVO ahora — abre el capítulo arriba
            </p>
          )}
        </div>
      </section>

      <ClubPulseWall clubId={club.id} />
    </div>
  );
}
