'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { ClubPulseWall } from '@/components/club/ClubPulseWall';
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

function kickDay(iso: string, tz: string) {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      timeZone: tz,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
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

function ClubTapeStamp({
  f,
  clubAbbr,
  tz,
}: {
  f: Fixture;
  clubAbbr: string;
  tz: string;
}) {
  const live = f.state === 'in';
  const done = f.state === 'post';
  const hs = Number(f.home.score ?? 0);
  const as = Number(f.away.score ?? 0);
  const homeWin = done && hs > as;
  const awayWin = done && as > hs;
  const chip = resultForClub(f, clubAbbr);

  return (
    <Link
      href={partidoHref(f)}
      data-testid={`club-recent-${f.id}`}
      className={[
        'club-chip',
        live ? 'is-live' : '',
        chip === 'W' ? 'is-win' : '',
        chip === 'L' ? 'is-loss' : '',
      ].join(' ')}
    >
      <div className="club-chip-top">
        <span className="club-chip-when">
          {live && <span className="hoy-live-dot" aria-hidden />}
          {live ? f.clock || 'LIVE' : kickDay(f.date, tz)}
        </span>
        {chip && <span className={`club-chip-wdl is-${chip.toLowerCase()}`}>{chip}</span>}
      </div>
      <div className="club-chip-line">
        <span className={['club-chip-side', homeWin ? 'won' : awayWin ? 'lost' : ''].join(' ')}>
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="xs" />
          {f.home.abbreviation}
        </span>
        <span className="club-chip-score">
          {done || live ? (
            <>
              <b>{f.home.score ?? 0}</b>
              <i>–</i>
              <b>{f.away.score ?? 0}</b>
            </>
          ) : (
            <em>VS</em>
          )}
        </span>
        <span className={['club-chip-side end', awayWin ? 'won' : homeWin ? 'lost' : ''].join(' ')}>
          {f.away.abbreviation}
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="xs" />
        </span>
      </div>
    </Link>
  );
}

function ClubTapeNext({ f, tz }: { f: Fixture; tz: string }) {
  return (
    <Link href={partidoHref(f)} data-testid={`club-upcoming-${f.id}`} className="club-chip is-next">
      <div className="club-chip-top">
        <span className="club-chip-when">{kickWhen(f.date, tz)}</span>
      </div>
      <div className="club-chip-line">
        <span className="club-chip-side">
          <ClubLogo abbr={f.home.abbreviation} name={f.home.name} size="xs" />
          {f.home.abbreviation}
        </span>
        <span className="club-chip-score">
          <em>VS</em>
        </span>
        <span className="club-chip-side end">
          {f.away.abbreviation}
          <ClubLogo abbr={f.away.abbreviation} name={f.away.name} size="xs" />
        </span>
      </div>
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

  const { club, next, live, table, form, recent, upcoming, accesoLine } = board;
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
                  <p className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
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
              {club.weatherLine} Sin silbato en el calendario inmediato — el cable y la grada
              siguen abajo.
            </p>
          )}
        </div>
      </section>

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
              <div className="club-tape-rail mt-3">
                {recent.map((f) => (
                  <ClubTapeStamp key={f.id} f={f} clubAbbr={club.abbreviation} tz={tz} />
                ))}
              </div>
            </div>
          )}

          {(upcoming.length > 0 || (next && next.state === 'pre' && upcoming.length === 0)) && (
            <div className="mt-10" data-testid="club-upcoming">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Próximos
              </p>
              <div className="club-tape-rail club-tape-rail-next mt-3">
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
