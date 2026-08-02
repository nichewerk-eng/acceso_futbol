'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useGravity } from '@/contexts/GravityContext';
import { teamNameEs } from '@/components/standings/teamNames';
import { getCurrentJornada } from '@/fixtures/ligamx-apertura-2026';
import type { LigaMXTable, LigaMXEntry } from '@/app/api/ligamx/standings/route';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';
import { mergeLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';

/** Apertura 2026: no Play-In — top 8 go straight to Liguilla. */
const LIGUILLA_SPOTS = 8;

function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface Props {
  initialTable: LigaMXTable | null;
  initialFixtures: LigaMXFixture[];
}

export default function LigaMXView({ initialTable, initialFixtures }: Props) {
  const { matchesGravity, club } = useGravity();
  const baseFixtures = mergeLigaMxSchedule(initialFixtures);

  const [table, setTable] = useState<LigaMXTable | null>(initialTable);
  const [fixtures, setFixtures] = useState<LigaMXFixture[]>(baseFixtures);
  const [tab, setTab] = useState<'tabla' | 'jornada'>('tabla');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userTz, setUserTz] = useState('America/Mexico_City');
  const [selectedJornada, setSelectedJornada] = useState(() => getCurrentJornada(baseFixtures));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [sr, fr] = await Promise.all([
        fetch('/api/ligamx/standings'),
        fetch('/api/ligamx/fixtures'),
      ]);
      if (sr.ok) setTable(await sr.json());
      if (fr.ok) {
        const d = await fr.json();
        // API already merges; keep client merge as safety for older caches.
        setFixtures(mergeLigaMxSchedule(d.fixtures ?? []));
      }
      setLastUpdated(new Date());
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => refresh(true), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const liveFixtures = fixtures.filter((f) => f.status.state === 'in');
  const allJornadas = Array.from({ length: 17 }, (_, i) => i + 1);
  const jornadaFixtures = fixtures
    .filter((f) => f.jornada === `Jornada ${selectedJornada}`)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const jornadaLive = jornadaFixtures.filter((f) => f.status.state === 'in');
  const jornadaPast = jornadaFixtures.filter((f) => f.status.state === 'post');
  const jornadaUpcoming = jornadaFixtures.filter((f) => f.status.state === 'pre');
  const entries = table?.entries ?? [];
  const isEmpty = entries.length === 0;

  const isMine = (f: LigaMXFixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  return (
    <div data-testid="page-liga-mx" className="bg-bg-1 text-foreground">
      {/* Hero */}
      <section
        data-testid="ligamx-hero"
        className="border-b border-line px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="af-tele text-foreground">
                <span className="text-signal">AF</span>
                ://LIGA MX
              </p>
              <h1
                className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-6xl"
                data-testid="ligamx-title"
              >
                {table?.season ?? 'Apertura 2026'}
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
                Tabla, jornada y camino a Liguilla. Misma sala que el pulso.
                {club ? ` Tu LOCK: ${club.abbreviation}.` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="af-tele" data-testid="ligamx-updated">
                SYNC{' '}
                {lastUpdated.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: userTz,
                })}
              </p>
              <button
                type="button"
                onClick={() => refresh(false)}
                disabled={refreshing}
                data-testid="ligamx-refresh"
                className="af-cta af-cta-ghost !py-2 disabled:opacity-40"
              >
                {refreshing ? 'Sync…' : 'Actualizar'}
              </button>
            </div>
          </div>

          {liveFixtures.length > 0 && (
            <div className="mt-8 grid gap-2 sm:grid-cols-2" data-testid="ligamx-live">
              {liveFixtures.map((f) => (
                <Link
                  key={f.id}
                  href={`/partido/liga-mx/${f.id}`}
                  className="hero-band hero-band-live"
                >
                  <span className="hero-band-stamp af-tele flex items-center gap-1.5">
                    <span className="hoy-live-dot" aria-hidden />
                    {f.status.displayClock || 'LIVE'}
                  </span>
                  <span className="hero-band-home">{f.home.abbreviation}</span>
                  <span className="hero-band-center">
                    {f.home.score ?? 0}:{f.away.score ?? 0}
                  </span>
                  <span className="hero-band-away">{f.away.abbreviation}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-line px-4 sm:px-6">
        <div
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-3"
          data-testid="ligamx-tabs"
          role="tablist"
        >
          {(
            [
              ['tabla', 'Tabla'],
              ['jornada', 'Jornada'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`ligamx-tab-${id}`}
              onClick={() => setTab(id)}
              className={[
                'shrink-0 border px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition',
                tab === id
                  ? 'border-foreground bg-foreground text-bg-1'
                  : 'border-line text-muted hover:border-foreground hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {tab === 'tabla' && (
          <section data-testid="ligamx-tabla">
            {isEmpty ? (
              <EmptyBoard
                title="Apertura 2026"
                body="La tabla llega cuando ESPN publica el Apertura. Mientras, revisa la jornada."
              />
            ) : (
              <>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <p className="af-tele text-foreground">
                      <span className="text-signal">AF</span>
                      ://TABLA
                    </p>
                    <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                      Posiciones · Liguilla
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                      Top 8 a cuartos (1v8, 2v7, 3v6, 4v5). Sin Play-In. Corte marcado abajo del 8.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Legend mark="signal" label="Liguilla 1–8" />
                    <Legend mark="ink" label="Fuera 9+" />
                  </div>
                </div>

                <div className="border border-line bg-bg-2" data-testid="ligamx-standings">
                  <div className="grid grid-cols-[2.25rem_1fr_2rem_2rem_2rem_2.25rem_2.5rem_2.75rem_auto] gap-1 border-b border-line px-3 py-2 af-tele sm:grid-cols-[2.5rem_1fr_2.25rem_2.25rem_2.25rem_2.5rem_2.5rem_2.5rem_3rem_auto] sm:px-4">
                    <span className="text-center">#</span>
                    <span>Club</span>
                    <span className="text-center">PJ</span>
                    <span className="text-center">G</span>
                    <span className="text-center">E</span>
                    <span className="text-center">P</span>
                    <span className="hidden text-center sm:block">GF</span>
                    <span className="text-center">DG</span>
                    <span className="text-center">Pts</span>
                    <span className="hidden text-right sm:block">Zona</span>
                  </div>
                  {entries.map((entry) => (
                    <StandingsRow
                      key={entry.team.id}
                      entry={entry}
                      mine={matchesGravity(
                        entry.team.name,
                        entry.team.name,
                        entry.team.abbreviation,
                        entry.team.abbreviation
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'jornada' && (
          <section data-testid="ligamx-jornada" className="space-y-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
              <div>
                <p className="af-tele text-foreground">
                  <span className="text-signal">AF</span>
                  ://JORNADA
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                  Jornada {selectedJornada}
                </h2>
                {jornadaFixtures[0]?.date && (
                  <p className="mt-2 af-tele">
                    {fmtDate(jornadaFixtures[0].date, userTz)}
                    {jornadaFixtures.length > 1
                      ? ` → ${fmtDate(jornadaFixtures[jornadaFixtures.length - 1].date, userTz)}`
                      : ''}
                  </p>
                )}
              </div>
              <p className="af-tele">
                {jornadaPast.length + jornadaLive.length}/{jornadaFixtures.length || '–'} sellados
              </p>
            </div>

            <div
              className="flex gap-1.5 overflow-x-auto pb-1"
              data-testid="ligamx-jornada-picker"
            >
              {allJornadas.map((j) => {
                const list = fixtures.filter((f) => f.jornada === `Jornada ${j}`);
                const hasLive = list.some((f) => f.status.state === 'in');
                const hasPast = list.some((f) => f.status.state === 'post');
                const active = j === selectedJornada;
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setSelectedJornada(j)}
                    data-testid={`ligamx-jornada-${j}`}
                    className={[
                      'relative shrink-0 border px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.14em] transition',
                      active
                        ? 'border-foreground bg-foreground text-bg-1'
                        : hasLive
                          ? 'border-signal text-signal'
                          : hasPast
                            ? 'border-line text-muted'
                            : 'border-line text-muted/70 hover:border-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    J{j}
                    {hasLive && !active && (
                      <span className="hoy-live-dot absolute -right-0.5 -top-0.5" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            {jornadaLive.length > 0 && (
              <div>
                <p className="mb-3 af-tele text-signal">En vivo</p>
                <div className="jor-mosaic">
                  {jornadaLive.map((f) => (
                    <MatchStamp key={f.id} f={f} tz={userTz} mine={isMine(f)} />
                  ))}
                </div>
              </div>
            )}

            {jornadaUpcoming.length > 0 && (
              <div>
                <p className="mb-3 af-tele text-foreground">Por jugar</p>
                <div className="jor-mosaic">
                  {jornadaUpcoming.map((f) => (
                    <MatchStamp key={f.id} f={f} tz={userTz} mine={isMine(f)} />
                  ))}
                </div>
              </div>
            )}

            {jornadaPast.length > 0 && (
              <div>
                <p className="mb-3 af-tele text-foreground">Sellados</p>
                <div className="jor-mosaic">
                  {jornadaPast.map((f) => (
                    <MatchStamp key={f.id} f={f} tz={userTz} mine={isMine(f)} />
                  ))}
                </div>
              </div>
            )}

            {jornadaFixtures.length === 0 && (
              <EmptyBoard
                title={`Jornada ${selectedJornada}`}
                body="Sin partidos registrados para esta fecha."
              />
            )}
          </section>
        )}

      </div>
    </div>
  );
}

function StandingsRow({ entry, mine }: { entry: LigaMXEntry; mine: boolean }) {
  const inLiguilla = entry.position <= LIGUILLA_SPOTS;
  const zoneEdge = entry.position === LIGUILLA_SPOTS + 1;

  return (
    <div
      data-testid={`ligamx-row-${entry.team.abbreviation}`}
      className={[
        'grid grid-cols-[2.25rem_1fr_2rem_2rem_2rem_2.25rem_2.5rem_2.75rem_auto] items-center gap-1 border-t border-line px-3 py-3 transition hover:bg-bg-3 sm:grid-cols-[2.5rem_1fr_2.25rem_2.25rem_2.25rem_2.5rem_2.5rem_2.5rem_3rem_auto] sm:px-4',
        zoneEdge ? 'border-t-2 border-t-foreground' : '',
        mine ? 'bg-signal/5' : '',
      ].join(' ')}
    >
      <span
        className={[
          'text-center font-display text-sm font-bold tabular-nums',
          inLiguilla ? 'text-signal' : 'text-muted',
        ].join(' ')}
      >
        {entry.position}
      </span>
      <div className="min-w-0">
        <p
          className={[
            'truncate font-display text-base font-bold uppercase tracking-wide sm:text-lg',
            mine ? 'text-signal' : 'text-foreground',
          ].join(' ')}
        >
          {entry.team.abbreviation}
          {mine && <span className="ml-2 af-tele !text-signal">LOCK</span>}
        </p>
        <p className="truncate text-xs text-muted">{teamNameEs(entry.team.name)}</p>
      </div>
      <span className="text-center text-xs text-muted">{entry.gp}</span>
      <span className="text-center text-xs text-muted">{entry.w}</span>
      <span className="text-center text-xs text-muted">{entry.d}</span>
      <span className="text-center text-xs text-muted">{entry.l}</span>
      <span className="hidden text-center text-xs text-muted sm:block">{entry.gf}</span>
      <span className="text-center text-xs text-muted">{entry.gd}</span>
      <span className="text-center font-display text-base font-bold tabular-nums text-foreground">
        {entry.pts}
      </span>
      <span
        className={[
          'af-tele text-right',
          inLiguilla ? 'text-signal' : 'text-muted',
        ].join(' ')}
      >
        {inLiguilla ? 'LIGUILLA' : 'FUERA'}
      </span>
    </div>
  );
}

function MatchStamp({
  f,
  tz,
  mine,
}: {
  f: LigaMXFixture;
  tz: string;
  mine: boolean;
}) {
  const live = f.status.state === 'in';
  const done = f.status.state === 'post';
  const hs = Number(f.home.score ?? 0);
  const as = Number(f.away.score ?? 0);
  const homeWin = done && hs > as;
  const awayWin = done && as > hs;
  const draw = done && hs === as;

  return (
    <Link
      href={`/partido/liga-mx/${f.id}`}
      data-testid={`ligamx-match-${f.id}`}
      className={[
        'jor-stamp',
        live ? 'jor-stamp-live' : '',
        mine ? 'jor-stamp-mine' : '',
      ].join(' ')}
    >
      <div className="jor-stamp-meta">
        {live && <span className="hoy-live-dot" aria-hidden />}
        <span>
          {live
            ? f.status.displayClock || 'LIVE'
            : done
              ? 'FT'
              : fmtTime(f.date, tz)}
        </span>
        {mine && <span className="text-signal">· LOCK</span>}
      </div>
      {(done || live) && (
        <p className="jor-stamp-score">
          <span className={homeWin ? 'is-win' : awayWin ? 'is-lose' : ''}>{f.home.score ?? 0}</span>
          <span className="mx-1 opacity-35">:</span>
          <span className={awayWin ? 'is-win' : homeWin ? 'is-lose' : ''}>{f.away.score ?? 0}</span>
        </p>
      )}
      {!done && !live && <p className="jor-stamp-score opacity-40">VS</p>}
      <div className="jor-stamp-teams">
        <span className={homeWin ? 'jor-team-win' : awayWin ? 'jor-team-lose' : draw ? 'jor-team-draw' : ''}>
          {f.home.abbreviation}
        </span>
        <span className={awayWin ? 'jor-team-win' : homeWin ? 'jor-team-lose' : draw ? 'jor-team-draw' : ''}>
          {f.away.abbreviation}
        </span>
      </div>
      <p className="jor-stamp-scorers">{fmtDate(f.date, tz)}</p>
    </Link>
  );
}

function Legend({ mark, label }: { mark: 'signal' | 'ink'; label: string }) {
  return (
    <p className="af-tele flex items-center gap-2">
      <span
        className={['inline-block h-2 w-2', mark === 'signal' ? 'bg-signal' : 'bg-foreground'].join(
          ' '
        )}
      />
      {label}
    </p>
  );
}

function EmptyBoard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-line bg-bg-2 px-6 py-14 text-center">
      <p className="font-display text-2xl font-bold uppercase tracking-wide">{title}</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
