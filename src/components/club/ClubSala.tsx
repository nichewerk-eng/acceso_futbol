'use client';

import Link from 'next/link';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { ClubPulseWall } from '@/components/club/ClubPulseWall';
import { ClubTrophyCase } from '@/components/club/ClubTrophyCase';
import { ClubsNav } from '@/components/club/ClubsNav';
import { LiguillaPathShare } from '@/components/ligamx/LiguillaPathShare';
import { SelladoFromFixture } from '@/components/match/SelladoCard';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import type { ClubBoard } from '@/lib/sports/clubBoard';
import {
  APERTURA_MATCHDAYS,
  liguillaCalendarLine,
  liguillaMarginLine,
  liguillaRuleLine,
} from '@/lib/sports/liguillaPath';
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

function ClubTapeStamp({
  f,
  clubAbbr,
}: {
  f: Fixture;
  clubAbbr: string;
}) {
  return (
    <SelladoFromFixture
      f={f}
      href={partidoHref(f)}
      testId={`club-recent-${f.id}`}
      clubResult={resultForClub(f, clubAbbr)}
    />
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
        <p className="jor-next-when">
          {kickWhen(f.date, tz)}
          {f.jornada ? ` · ${f.jornada}` : ''}
        </p>
      </div>
      <div className="jor-next-vs">
        <span className="jor-next-side jor-next-home">
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={f.home.id}
            name={f.home.name}
            logoUrl={f.home.logo}
            size="sm"
          />
          <span className="jor-next-abbr">{f.home.abbreviation}</span>
        </span>
        <span className="jor-next-mid">VS</span>
        <span className="jor-next-side jor-next-away">
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={f.away.id}
            name={f.away.name}
            logoUrl={f.away.logo}
            size="sm"
          />
          <span className="jor-next-abbr">{f.away.abbreviation}</span>
        </span>
      </div>
      <p className="jor-next-when jor-next-cta">Ficha del partido</p>
    </Link>
  );
}

export function ClubSala({ initialBoard }: { initialBoard: ClubBoard }) {
  const board = initialBoard;
  const tz = useDeviceTimeZone();

  const { club, next, live, table, liguilla, form, recent, upcoming, accesoLine } = board;
  const style = {
    ['--club-ink' as string]: club.palette.ink,
    ['--club-signal' as string]: club.palette.signal,
    ['--club-on-ink' as string]: club.palette.onInk,
  };

  return (
    <div className="club-sala" style={style} data-testid="club-sala" data-club={club.id}>
      {/* Hero — one composition */}
      <section className="club-hero" data-testid="club-hero">
        <div className="club-hero-scan" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="af-tele club-tele club-hero-path animate-pulse-in">
            <span className="text-[var(--club-signal)]">AF</span>
            ://CLUB/{club.abbreviation}
          </p>

          <div className="club-hero-id">
            <div className="club-crest-wrap animate-pulse-in">
              <ClubLogo
                clubId={club.id}
                abbr={club.abbreviation}
                name={club.name}
                size="xl"
                className="club-crest"
              />
            </div>
            <div className="club-hero-copy animate-pulse-in-delay">
              <h1 className="club-hero-name" data-testid="club-name">
                {club.name}
              </h1>
              <p className="club-acceso-line" data-testid="club-acceso-line">
                {accesoLine}
              </p>
            </div>
            {table && (
              <Link
                href="/liga-mx?tab=tabla"
                className="club-tabla animate-pulse-in-delay"
                data-testid="club-table-chip"
                title="Ver tabla Liga MX"
              >
                <span className="club-tabla-pos">{table.position}º</span>
                <span className="club-tabla-copy">
                  <span className="club-tabla-kicker">Tabla</span>
                  <span className="club-tabla-line">
                    {table.pts} pts · {table.gp} PJ
                  </span>
                </span>
              </Link>
            )}
            <div className="club-hero-tools animate-pulse-in-delay-2">
              {!table && form.length > 0 && (
                <p className="af-tele club-tele">FORMA {form.map((m) => m.result).join('')}</p>
              )}
            </div>
          </div>

          <ClubTrophyCase clubId={club.id} embedded />
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
                <div className="club-next-pair mt-3">
                  <ClubLogo
                    abbr={next.home.abbreviation}
                    clubId={next.home.id}
                    name={next.home.name}
                    logoUrl={next.home.logo}
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
                    clubId={next.away.id}
                    name={next.away.name}
                    logoUrl={next.away.logo}
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
              Sin silbato en el calendario inmediato — las noticias y la grada siguen abajo.
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
            <h2
              className="mt-3 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl"
              data-testid="club-liguilla-headline"
            >
              {liguilla.headline}
            </h2>
            <p className="mt-2 max-w-xl font-mono text-[13px] leading-6 text-muted">
              {liguillaRuleLine(liguilla)}
            </p>

            <dl className="club-liguilla-facts" data-testid="club-liguilla-facts">
              {table && (
                <>
                  <div>
                    <dt>Posición</dt>
                    <dd>
                      {table.position}º
                      <span className="club-liguilla-sub">de 18</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Puntos</dt>
                    <dd>
                      {table.pts}
                      <span className="club-liguilla-sub">
                        {table.w}G · {table.d}E · {table.l}P
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Jugados</dt>
                    <dd>
                      {table.gp}
                      <span className="club-liguilla-sub">de {APERTURA_MATCHDAYS}</span>
                    </dd>
                  </div>
                </>
              )}
              <div className="club-liguilla-span">
                <dt>{liguilla.marginSide === 'behind' ? 'Atraso' : 'Margen'}</dt>
                <dd className="club-liguilla-margin">{liguillaMarginLine(liguilla)}</dd>
              </div>
              <div className="club-liguilla-span">
                <dt>Calendario</dt>
                <dd className="club-liguilla-margin">{liguillaCalendarLine(liguilla)}</dd>
              </div>
            </dl>

            <Link
              href="/liga-mx?tab=tabla"
              className="mt-5 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal hover:text-foreground"
            >
              Ver tabla completa
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

      <div className="border-t border-line bg-bg-1 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <ClubsNav
            activeSlug={club.id}
            title="Otras salas"
            dek="Partidos, pulso y cobertura de cada club de Liga MX."
          />
        </div>
      </div>
    </div>
  );
}
