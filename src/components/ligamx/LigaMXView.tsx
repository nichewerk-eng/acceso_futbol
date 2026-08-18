'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { LigaMxMark } from '@/components/brand/LigaMxMark';
import { LigaMxFemenilMark } from '@/components/brand/LigaMxFemenilMark';
import { PartidoLink } from '@/components/partido/PartidoLink';
import { useGravity } from '@/contexts/GravityContext';
import { teamNameEs } from '@/components/standings/teamNames';
import { resolveDondeVer } from '@/config/dondeVer';
import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import { getCurrentJornada } from '@/fixtures/ligamx-apertura-2026';
import type { LigaMXTable, LigaMXEntry } from '@/app/api/ligamx/standings/route';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';
import { liveFetch } from '@/lib/client/liveFetch';
import { startLivePoll } from '@/lib/client/livePoll';
import { FRESH, paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import { mergeLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';
import { LIGUILLA_SPOTS, liguillaPath } from '@/lib/sports/liguillaPath';
import { FEMENIL_LIGUILLA_SPOTS } from '@/lib/sports/ligaMxFemenil';
import { LiguillaPathShare } from '@/components/ligamx/LiguillaPathShare';
import { GoleoRailCard, GoleoTabla } from '@/components/ligamx/GoleoTabla';
import type { GoleoBoard } from '@/lib/sports/leaders';

/** Shared header + row shell — tracks live in `.lm-standings-grid` (globals.css). */
const STANDINGS_GRID = 'lm-standings-grid';

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

function dayKeyInTz(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: tz });
}

function groupByDay(rows: LigaMXFixture[], tz: string) {
  const byDay = new Map<string, LigaMXFixture[]>();
  for (const f of rows) {
    const day = dayKeyInTz(f.date, tz);
    const list = byDay.get(day) ?? [];
    list.push(f);
    byDay.set(day, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayRows]) => ({
      day,
      label: new Date(`${day}T12:00:00.000Z`).toLocaleDateString('es-MX', {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
      rows: [...dayRows].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    }));
}

function fmtKick(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function shortClubName(name: string, abbr: string) {
  const cleaned = name
    .replace(/\b(F\.?C\.?|C\.?F\.?|S\.?C\.?|Club|Deportivo|CF)\b/gi, '')
    .replace(/\s+W$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return abbr;
  if (cleaned.length > 14) return abbr;
  return cleaned;
}

type GravityFn = (
  homeName: string,
  awayName: string,
  homeAbbr?: string,
  awayAbbr?: string
) => boolean;

type LigaMxTab = 'tabla' | 'jornada' | 'goleo';
export type LigaMxBoardLeague = 'liga-mx' | 'liga-mx-femenil';

interface Props {
  initialTable: LigaMXTable | null;
  initialFixtures: LigaMXFixture[];
  initialGoleo?: GoleoBoard | null;
  initialTab?: LigaMxTab;
  league?: LigaMxBoardLeague;
}

export default function LigaMXView({
  initialTable,
  initialFixtures,
  initialGoleo = null,
  initialTab = 'jornada',
  league = 'liga-mx',
}: Props) {
  const router = useRouter();
  const { matchesGravity, club } = useGravity();
  const hubPath = league === 'liga-mx-femenil' ? '/liga-mx-femenil' : '/liga-mx';
  const fixturesApi =
    league === 'liga-mx-femenil' ? '/api/ligamx-femenil/fixtures' : '/api/ligamx/fixtures';
  const standingsApi =
    league === 'liga-mx-femenil' ? '/api/ligamx-femenil/standings' : '/api/ligamx/standings';
  const baseFixtures =
    league === 'liga-mx' ? mergeLigaMxSchedule(initialFixtures) : initialFixtures;

  const [table, setTable] = useState<LigaMXTable | null>(initialTable);
  const [fixtures, setFixtures] = useState<LigaMXFixture[]>(baseFixtures);
  const [goleo] = useState<GoleoBoard | null>(initialGoleo);
  const [tab, setTab] = useState<LigaMxTab>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [userTz, setUserTz] = useState('America/Mexico_City');
  const [selectedJornada, setSelectedJornada] = useState(() => getCurrentJornada(baseFixtures));
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
    setLastUpdated(new Date());
  }, []);

  const paceRef = useRef<FreshPace>('near');
  const lastStandingsAt = useRef(0);

  const refreshFixtures = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const fr = await liveFetch(fixturesApi);
      if (fr.ok) {
        const d = await fr.json();
        const raw = (d.fixtures ?? []) as LigaMXFixture[];
        const next = league === 'liga-mx' ? mergeLigaMxSchedule(raw) : raw;
        setFixtures(next);
        paceRef.current = paceFromFixtures(
          next.map((f) => ({
            state: f.status.state,
            date: f.date,
            clock: f.status.displayClock,
          }))
        );
      }
      // Standings change slowly — refresh on a separate budget.
      if (Date.now() - lastStandingsAt.current >= FRESH.standingsClientMs) {
        const sr = await fetch(standingsApi);
        if (sr.ok) {
          setTable(await sr.json());
          lastStandingsAt.current = Date.now();
        }
      }
      setLastUpdated(new Date());
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [fixturesApi, league, standingsApi]);

  const refresh = useCallback(async (silent = false) => {
    lastStandingsAt.current = 0;
    await refreshFixtures(silent);
  }, [refreshFixtures]);

  useEffect(
    () => startLivePoll(() => void refreshFixtures(true), { getPace: () => paceRef.current }),
    [refreshFixtures]
  );

  const contextoPrefetchKey = useMemo(() => {
    const n = getCurrentJornada(fixtures);
    return fixtures
      .filter((f) => f.jornada === `Jornada ${n}` && f.status.state !== 'in')
      .map((f) => f.id)
      .join(',');
  }, [fixtures]);

  useEffect(() => {
    if (!contextoPrefetchKey) return;
    for (const id of contextoPrefetchKey.split(',')) {
      if (!id) continue;
      void fetch(`/api/sports/match/${league}/${id}/contexto`);
    }
  }, [contextoPrefetchKey, league]);

  const allJornadas =
    league === 'liga-mx-femenil'
      ? Array.from(
          new Set(
            fixtures
              .map((f) => Number(f.jornada?.match(/(\d+)/)?.[1]))
              .filter((n) => Number.isFinite(n) && n > 0)
          )
        ).sort((a, b) => a - b)
      : Array.from({ length: 17 }, (_, i) => i + 1);
  useEffect(() => {
    if (allJornadas.length === 0) return;
    if (!allJornadas.includes(selectedJornada)) {
      setSelectedJornada(allJornadas[allJornadas.length - 1] ?? 1);
    }
  }, [allJornadas, selectedJornada]);
  const jornadaFixtures = fixtures
    .filter((f) => f.jornada === `Jornada ${selectedJornada}`)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const jornadaLive = jornadaFixtures.filter((f) => f.status.state === 'in');
  const jornadaPast = jornadaFixtures.filter((f) => f.status.state === 'post');
  const jornadaUpcoming = jornadaFixtures.filter((f) => f.status.state === 'pre');
  const upcomingByDay = groupByDay(jornadaUpcoming, userTz);
  const pastByDay = groupByDay(jornadaPast, userTz);
  const todayKey = dayKeyInTz(new Date().toISOString(), userTz);
  const entries = table?.entries ?? [];
  const groups = table?.groups ?? [];
  const grouped = league === 'liga-mx-femenil' && groups.length > 1;
  const liguillaSpots = grouped ? FEMENIL_LIGUILLA_SPOTS : LIGUILLA_SPOTS;
  const isEmpty = entries.length === 0;

  const isMine = (f: LigaMXFixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  const selectTab = useCallback(
    (id: LigaMxTab) => {
      setTab(id);
      const url = id === 'jornada' ? hubPath : `${hubPath}?tab=${id}`;
      router.replace(url, { scroll: false });
    },
    [hubPath, router]
  );
  const openTabla = useCallback(() => selectTab('tabla'), [selectTab]);
  const openGoleo = useCallback(() => selectTab('goleo'), [selectTab]);
  const goleoMine = useCallback(
    (abbr?: string) =>
      Boolean(abbr && matchesGravity(abbr, abbr, abbr, abbr)),
    [matchesGravity]
  );

  return (
    <div
      data-testid={league === 'liga-mx-femenil' ? 'page-liga-mx-femenil' : 'page-liga-mx'}
      className="bg-bg-1 text-foreground"
    >
      {/* Hero */}
      <section
        data-testid="ligamx-hero"
        className="border-b border-line px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="af-tele text-signal">
                <span className="text-signal">AF</span>
                ://{league === 'liga-mx-femenil' ? 'LIGA MX FEMENIL' : 'LIGA MX'}
              </p>
              <h1 className="sr-only" data-testid="ligamx-title">
                {league === 'liga-mx-femenil' ? 'Liga MX Femenil' : 'Liga MX'} ·{' '}
                {table?.season ?? 'Apertura 2026'}
              </h1>
              {league === 'liga-mx-femenil' ? (
                <LigaMxFemenilMark size="lg" priority className="lm-femenil-hero-mark mt-4" />
              ) : (
                <LigaMxMark size="lg" priority className="lm-hero-mark mt-4" />
              )}
              <p className="mt-3 font-display text-2xl font-bold uppercase tracking-wide text-foreground sm:text-3xl">
                {table?.season ?? 'Apertura 2026'}
              </p>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
                Jornada, tabla y goleo en una sola sala. Camino a Liguilla (top 8).
                {club ? ` Tu LOCK: ${club.abbreviation}.` : ''}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="af-tele" data-testid="ligamx-updated" suppressHydrationWarning>
                SYNC{' '}
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: userTz,
                    })
                  : '—'}
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
        </div>
      </section>

      {/* Tabs — Jornada (combined sala) first */}
      <div className="border-b border-line px-4 sm:px-6">
        <div
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-3"
          data-testid="ligamx-tabs"
          role="tablist"
        >
          {(
            [
              ['jornada', 'Jornada'],
              ['tabla', 'Tabla'],
              ['goleo', 'Goleo'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`ligamx-tab-${id}`}
              onClick={() => selectTab(id)}
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
                body={
                  league === 'liga-mx-femenil'
                    ? 'La tabla llega cuando Sportmonks publica el Apertura Femenil. Mientras, revisa la jornada.'
                    : 'La tabla llega cuando ESPN publica el Apertura. Mientras, revisa la jornada.'
                }
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
                      {grouped ? 'Posiciones · Grupos' : 'Posiciones · Liguilla'}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Legend
                      mark="signal"
                      label={grouped ? 'Liguilla 1–4 por grupo' : 'Liguilla 1–8'}
                    />
                    <Legend mark="ink" label={grouped ? 'Fuera 5+' : 'Fuera 9+'} />
                  </div>
                </div>

                {grouped ? (
                  <div className="space-y-12" data-testid="ligamx-standings-groups">
                    {groups.map((g) => (
                      <div key={g.id}>
                        <h3 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">
                          {g.name}
                        </h3>
                        <StandingsBoard
                          entries={g.entries}
                          matchesGravity={matchesGravity}
                          liguillaSpots={liguillaSpots}
                          testId={`ligamx-standings-${g.id}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <StandingsBoard
                    entries={entries}
                    matchesGravity={matchesGravity}
                    liguillaSpots={liguillaSpots}
                    testId="ligamx-standings"
                  />
                )}
              </>
            )}
          </section>
        )}

        {tab === 'goleo' && (
          <section data-testid="ligamx-goleo-tab">
            <GoleoTabla
              board={goleo}
              isMine={goleoMine}
              sourceNote={league === 'liga-mx-femenil' ? 'fuente Sportmonks.' : undefined}
            />
          </section>
        )}

        {tab === 'jornada' && (
          <div className="lc-partidos-layout" data-testid="ligamx-jornada-layout">
            <div className="lc-partidos-main space-y-8">
              <section data-testid="ligamx-jornada">
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
                    {jornadaPast.length + jornadaLive.length}/{jornadaFixtures.length || '–'}{' '}
                    sellados
                  </p>
                </div>

                <div
                  className="mt-6 flex gap-1.5 overflow-x-auto pb-1"
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
              </section>

              {jornadaLive.length > 0 && (
                <div>
                  <p className="mb-3 af-tele text-signal">En vivo</p>
                  <ul className="lc-day-list">
                    {jornadaLive.map((f) => (
                      <KickRow key={f.id} f={f} tz={userTz} mine={isMine(f)} league={league} />
                    ))}
                  </ul>
                </div>
              )}

              {upcomingByDay.length > 0 && (
                <div data-testid="ligamx-por-jugar">
                  <p className="mb-4 af-tele text-foreground">Por jugar</p>
                  <div className="lc-day-stack">
                    {upcomingByDay.map((group) => (
                      <div
                        key={group.day}
                        className={[
                          'lc-day',
                          group.day === todayKey ? 'lc-day-today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="lc-day-head">
                          {group.day === todayKey && (
                            <span className="lc-day-kicker">Hoy</span>
                          )}
                          <h4 className="lc-day-title">{group.label}</h4>
                        </div>
                        <ul className="lc-day-list">
                          {group.rows.map((f) => (
                            <KickRow key={f.id} f={f} tz={userTz} mine={isMine(f)} league={league} />
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jornadaPast.length > 0 && (
                <div data-testid="ligamx-sellados">
                  <p className="mb-4 af-tele text-foreground">Sellados</p>
                  <div className="lc-day-stack">
                    {pastByDay.map((group) => (
                      <div
                        key={group.day}
                        className={[
                          'lc-day',
                          group.day === todayKey ? 'lc-day-today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="lc-day-head">
                          {group.day === todayKey && (
                            <span className="lc-day-kicker">Hoy</span>
                          )}
                          <h4 className="lc-day-title">{group.label}</h4>
                        </div>
                        <ul className="lc-day-list">
                          {group.rows.map((f) => (
                            <KickRow key={f.id} f={f} tz={userTz} mine={isMine(f)} league={league} />
                          ))}
                        </ul>
                      </div>
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

              <div className="lc-mobile-tabla space-y-6">
                <LmClasificacionCard
                  entries={entries}
                  groups={grouped ? groups : undefined}
                  liguillaSpots={liguillaSpots}
                  matchesGravity={matchesGravity}
                  onOpenTabla={openTabla}
                />
                <GoleoRailCard board={goleo} isMine={goleoMine} onOpenGoleo={openGoleo} />
              </div>
            </div>

            <LmPartidosRail
              entries={entries}
              groups={grouped ? groups : undefined}
              liguillaSpots={liguillaSpots}
              goleo={goleo}
              jornadaUpcoming={jornadaUpcoming}
              userTz={userTz}
              clubName={club?.name ?? null}
              clubAbbr={club?.abbreviation ?? null}
              matchesGravity={matchesGravity}
              goleoMine={goleoMine}
              onOpenTabla={openTabla}
              onOpenGoleo={openGoleo}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LmPartidosRail({
  entries,
  groups,
  liguillaSpots,
  goleo,
  jornadaUpcoming,
  userTz,
  clubName,
  clubAbbr,
  matchesGravity,
  goleoMine,
  onOpenTabla,
  onOpenGoleo,
}: {
  entries: LigaMXEntry[];
  groups?: { id: string; name: string; entries: LigaMXEntry[] }[];
  liguillaSpots: number;
  goleo: GoleoBoard | null;
  jornadaUpcoming: LigaMXFixture[];
  userTz: string;
  clubName: string | null;
  clubAbbr: string | null;
  matchesGravity: GravityFn;
  goleoMine: (abbr?: string) => boolean;
  onOpenTabla: () => void;
  onOpenGoleo: () => void;
}) {
  const myEntry = useMemo(() => {
    if (!clubName && !clubAbbr) return null;
    return (
      entries.find((e) =>
        matchesGravity(e.team.name, e.team.name, e.team.abbreviation, e.team.abbreviation)
      ) ?? null
    );
  }, [clubName, clubAbbr, entries, matchesGravity]);

  const myNext = useMemo(() => {
    if (!clubName && !clubAbbr) return null;
    return (
      jornadaUpcoming.find((f) =>
        matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation)
      ) ?? null
    );
  }, [clubName, clubAbbr, jornadaUpcoming, matchesGravity]);

  const grouped = Boolean(groups && groups.length > 1);
  const path = useMemo(() => {
    if (!myEntry || grouped) return null;
    return liguillaPath(
      {
        position: myEntry.position,
        pts: myEntry.pts,
        gp: myEntry.gp,
        abbreviation: myEntry.team.abbreviation,
      },
      entries.map((e) => ({
        position: e.position,
        pts: e.pts,
        gp: e.gp,
        abbreviation: e.team.abbreviation,
      }))
    );
  }, [myEntry, entries, grouped]);

  return (
    <aside className="lc-rail" data-testid="ligamx-rail">
      {myEntry && (
        <div className="lc-rail-block lc-rail-mine" data-testid="ligamx-rail-mine">
          <p className="af-tele text-signal">Tu club</p>
          <div className="lc-rail-mine-row">
            <ClubLogo
              abbr={myEntry.team.abbreviation}
              name={myEntry.team.name}
              logoUrl={myEntry.team.logo}
              size="sm"
            />
            <div className="min-w-0">
              <p className="lc-rail-mine-name">{myEntry.team.abbreviation}</p>
              <p className="af-tele text-muted">#{myEntry.position}</p>
            </div>
            <p className="lc-rail-mine-pts">
              <span>{myEntry.pts}</span>
              <span className="af-tele text-muted">pts</span>
            </p>
          </div>
          <p
            className={[
              'lc-rail-mine-mark',
              path?.zone === 'in' || path?.zone === 'edge' || myEntry.position <= liguillaSpots
                ? 'text-signal'
                : 'text-muted',
            ].join(' ')}
            data-testid="liguilla-path-headline"
          >
            {path?.headline ?? (myEntry.position <= liguillaSpots ? 'Liguilla' : 'Fuera')}
          </p>
          {myNext && (
            <p className="lc-rail-next">
              <span className="af-tele text-muted">Siguiente</span>
              <span className="lc-rail-next-match">
                {fmtTime(myNext.date, userTz)} · {myNext.home.abbreviation}–
                {myNext.away.abbreviation}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="lc-rail-tabla-desk space-y-4">
        <LmClasificacionCard
          entries={entries}
          groups={groups}
          liguillaSpots={liguillaSpots}
          matchesGravity={matchesGravity}
          onOpenTabla={onOpenTabla}
        />
        <GoleoRailCard board={goleo} isMine={goleoMine} onOpenGoleo={onOpenGoleo} />
      </div>

      <div className="lc-rail-block" data-testid="ligamx-rail-liguilla">
        <div className="flex items-start justify-between gap-3">
          <p className="af-tele text-foreground">Camino a Liguilla</p>
          {path && myEntry ? <LiguillaPathShare abbr={myEntry.team.abbreviation} path={path} /> : null}
        </div>
        {path ? (
          <>
            <p className="lg-path-line" data-testid="liguilla-path-detail">
              {path.detail}
            </p>
            <p className="lc-rail-note">Top {LIGUILLA_SPOTS} directo · sin Play-In</p>
          </>
        ) : grouped ? (
          <ul className="lc-rail-tv-list">
            <li>Top 4 de cada grupo a Liguilla</li>
            <li>Grupo A y Grupo B · 9 clubes cada uno</li>
            <li>Corte en la posición 4</li>
          </ul>
        ) : (
          <ul className="lc-rail-tv-list">
            <li>Top 8 directo a la fiesta grande</li>
            <li>Sin Play-In en el Apertura 2026</li>
            <li>Corte en la posición 8</li>
          </ul>
        )}
      </div>
    </aside>
  );
}

function LmClasificacionCard({
  entries,
  groups,
  liguillaSpots,
  matchesGravity,
  onOpenTabla,
}: {
  entries: LigaMXEntry[];
  groups?: { id: string; name: string; entries: LigaMXEntry[] }[];
  liguillaSpots: number;
  matchesGravity: GravityFn;
  onOpenTabla: () => void;
}) {
  const grouped = Boolean(groups && groups.length > 1);
  const rows = useMemo(() => {
    if (grouped || entries.length === 0) return [] as LigaMXEntry[];
    const window = entries.slice(0, liguillaSpots + 1);
    const mine = entries.find((e) =>
      matchesGravity(e.team.name, e.team.name, e.team.abbreviation, e.team.abbreviation)
    );
    if (mine && mine.position > liguillaSpots + 1) {
      return [...window, mine];
    }
    return window;
  }, [entries, grouped, liguillaSpots, matchesGravity]);

  if (entries.length === 0) {
    return (
      <div className="lc-rail-block lc-clasificacion" data-testid="ligamx-rail-tabla">
        <div className="lc-rail-block-head">
          <p className="af-tele text-foreground">Clasificación</p>
          <button type="button" className="lc-rail-link" onClick={onOpenTabla}>
            Tabla completa
          </button>
        </div>
        <p className="lc-rail-note">La tabla llega cuando hay datos del Apertura.</p>
      </div>
    );
  }

  return (
    <div className="lc-rail-block lc-clasificacion" data-testid="ligamx-rail-tabla">
      <div className="lc-rail-block-head">
        <p className="af-tele text-foreground">Clasificación</p>
        <button type="button" className="lc-rail-link" onClick={onOpenTabla}>
          Tabla completa
        </button>
      </div>
      <p className="lc-rail-note">
        {grouped ? `Top ${liguillaSpots} de cada grupo → Liguilla` : `Top ${liguillaSpots} → Liguilla`}
      </p>
      <div
        className={[
          'lc-clasificacion-grid',
          grouped ? '' : 'lm-clasificacion-solo',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {grouped
          ? groups!.map((g) => (
              <RailMiniStandings
                key={g.id}
                title={g.name}
                entries={g.entries}
                liguillaSpots={liguillaSpots}
                matchesGravity={matchesGravity}
              />
            ))
          : (
              <RailMiniStandings
                title="Apertura"
                entries={rows}
                liguillaSpots={liguillaSpots}
                matchesGravity={matchesGravity}
              />
            )}
      </div>
    </div>
  );
}

function RailMiniStandings({
  title,
  entries,
  liguillaSpots,
  matchesGravity,
}: {
  title: string;
  entries: LigaMXEntry[];
  liguillaSpots: number;
  matchesGravity: GravityFn;
}) {
  const rows = entries.slice(0, liguillaSpots + 1);
  return (
    <div className="lc-rail-mini">
      <div className="lc-rail-mini-head">
        <h4>{title}</h4>
        <span className="af-tele text-muted">Pts</span>
      </div>
      <ul className="lc-rail-mini-list">
        {rows.map((entry) => {
          const mine = matchesGravity(
            entry.team.name,
            entry.team.name,
            entry.team.abbreviation,
            entry.team.abbreviation
          );
          const cut = entry.position === liguillaSpots;
          return (
            <li
              key={entry.team.id || entry.team.abbreviation}
              className={[
                'lc-rail-mini-row',
                cut ? 'lc-rail-mini-cut' : '',
                entry.position > liguillaSpots ? 'lc-rail-mini-out' : '',
                mine ? 'lc-rail-mini-mine' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="lc-rail-mini-pos">{entry.position}</span>
              <ClubLogo
                abbr={entry.team.abbreviation}
                name={entry.team.name}
                logoUrl={entry.team.logo}
                size="xs"
              />
              <span className="lc-rail-mini-abbr">{entry.team.abbreviation}</span>
              <span className="lc-rail-mini-mark">
                {entry.position <= liguillaSpots ? '·' : '×'}
              </span>
              <span className="lc-rail-mini-pts">{entry.pts}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StandingsBoard({
  entries,
  matchesGravity,
  liguillaSpots,
  testId,
}: {
  entries: LigaMXEntry[];
  matchesGravity: GravityFn;
  liguillaSpots: number;
  testId?: string;
}) {
  return (
    <div className="border border-line bg-bg-2" data-testid={testId}>
      <div className={[STANDINGS_GRID, 'border-b border-line py-2 af-tele'].join(' ')}>
        <span className="text-center">#</span>
        <span>Club</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">E</span>
        <span className="text-center">P</span>
        <span className="lm-col-desktop text-center">GF</span>
        <span className="text-center">DG</span>
        <span className="text-center">Pts</span>
        <span className="lm-col-desktop text-right">Zona</span>
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
          liguillaSpots={liguillaSpots}
        />
      ))}
    </div>
  );
}

function StandingsRow({
  entry,
  mine,
  liguillaSpots = LIGUILLA_SPOTS,
}: {
  entry: LigaMXEntry;
  mine: boolean;
  liguillaSpots?: number;
}) {
  const inLiguilla = entry.position <= liguillaSpots;
  const zoneEdge = entry.position === liguillaSpots + 1;
  const clubSlug = ligaMxClubIdFromAbbr(entry.team.abbreviation);
  const nameTone = mine ? 'text-signal' : 'text-foreground';
  const lockMark = mine ? (
    <span className="ml-2 af-tele !text-signal">LOCK</span>
  ) : null;
  const teamLabel = (
    <>
      <ClubLogo
        abbr={entry.team.abbreviation}
        name={entry.team.name}
        logoUrl={entry.team.logo}
        size="sm"
      />
      <span className="min-w-0 truncate">
        <span className={['club-word club-word-sm sm:hidden', nameTone].join(' ')}>
          {entry.team.abbreviation}
          {lockMark}
        </span>
        <span
          className={[
            'hidden font-display text-base font-bold uppercase tracking-wide sm:inline',
            nameTone,
          ].join(' ')}
        >
          {teamNameEs(entry.team.name)}
          {mine ? <span className="ml-2 af-tele !text-signal">LOCK</span> : null}
        </span>
      </span>
    </>
  );

  return (
    <div
      data-testid={`ligamx-row-${entry.team.abbreviation}`}
      className={[
        STANDINGS_GRID,
        'border-t border-line py-3 transition hover:bg-bg-3',
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
      <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
        {clubSlug ? (
          <Link
            href={`/club/${clubSlug}`}
            className="flex min-w-0 items-center gap-2 sm:gap-2.5 transition hover:opacity-90"
            data-testid={`ligamx-club-${clubSlug}`}
          >
            {teamLabel}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">{teamLabel}</span>
        )}
      </div>
      <span className="text-center text-xs tabular-nums text-muted">{entry.gp}</span>
      <span className="text-center text-xs tabular-nums text-muted">{entry.w}</span>
      <span className="text-center text-xs tabular-nums text-muted">{entry.d}</span>
      <span className="text-center text-xs tabular-nums text-muted">{entry.l}</span>
      <span className="lm-col-desktop text-center text-xs tabular-nums text-muted">{entry.gf}</span>
      <span className="text-center text-xs tabular-nums text-muted">{entry.gd}</span>
      <span className="text-center font-display text-sm font-bold tabular-nums text-foreground sm:text-base">
        {entry.pts}
      </span>
      <span
        className={[
          'lm-col-desktop af-tele text-right',
          inLiguilla ? 'text-signal' : 'text-muted',
        ].join(' ')}
      >
        {inLiguilla ? 'LIGUILLA' : 'FUERA'}
      </span>
    </div>
  );
}

function KickRow({
  f,
  tz,
  mine,
  league,
}: {
  f: LigaMXFixture;
  tz: string;
  mine: boolean;
  league: LigaMxBoardLeague;
}) {
  const live = f.status.state === 'in';
  const done = f.status.state === 'post';
  const when = live
    ? f.status.displayClock || 'LIVE'
    : done
      ? 'FT'
      : fmtKick(f.date, tz);
  const center = done || live ? `${f.home.score ?? 0}–${f.away.score ?? 0}` : 'VS';
  const homeId = ligaMxClubIdFromAbbr(f.home.abbreviation);
  const awayId = ligaMxClubIdFromAbbr(f.away.abbreviation);
  const tv = resolveDondeVer({
    date: f.date,
    league,
    venue: f.venue,
    city: f.city,
    home: {
      id: homeId ?? f.home.abbreviation,
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score,
    },
    away: {
      id: awayId ?? f.away.abbreviation,
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: f.away.score,
    },
  });
  const hasTv = tv.mxChannels.length > 0 || tv.usChannels.length > 0;

  return (
    <li className="lc-match-item">
      <PartidoLink
        href={`/partido/${league}/${f.id}`}
        data-testid={`ligamx-match-${f.id}`}
        className={[
          'lc-match lm-kick',
          live ? 'lc-match-live' : '',
          mine ? 'lc-match-mine' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={f.venue || undefined}
      >
        <span className="lc-match-home">
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={homeId}
            name={f.home.name}
            size="sm"
          />
          <span className="lc-match-name" title={f.home.name}>
            {shortClubName(f.home.name, f.home.abbreviation)}
          </span>
        </span>

        <div className="lc-match-mid">
          {(!done || mine) && (
            <div className="lc-match-when">
              {!done && (
                <p className="lc-match-when-primary">
                  {live && <span className="hoy-live-dot mr-1.5" aria-hidden />}
                  {when}
                  {!live ? <span className="lc-match-when-hrs"> hrs</span> : null}
                </p>
              )}
              {mine && <span className="lc-match-lock">TU CLUB</span>}
            </div>
          )}
          <span
            className={[
              'lc-match-center',
              done || live ? 'lc-match-center-score' : 'lc-match-center-vs',
              done ? 'lc-match-center-ft' : '',
            ].join(' ')}
          >
            {done ? (
              <>
                <span className="lc-match-score-n">{f.home.score ?? 0}</span>
                <span className="lc-match-ft">-FT-</span>
                <span className="lc-match-score-n">{f.away.score ?? 0}</span>
              </>
            ) : (
              center
            )}
          </span>
        </div>

        <span className="lc-match-away">
          <span className="lc-match-name" title={f.away.name}>
            {shortClubName(f.away.name, f.away.abbreviation)}
          </span>
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={awayId}
            name={f.away.name}
            size="sm"
          />
        </span>

        {f.venue ? (
          <p className="lc-match-venue">
            <span>{f.venue}</span>
          </p>
        ) : null}

        {hasTv ? (
          <BroadcastChannels
            className="lc-match-tv tv-inline-desk"
            mx={tv.mxChannels}
            us={tv.usChannels}
            mxLabel={tv.mx}
            usLabel={tv.us}
            inline
          />
        ) : null}
      </PartidoLink>
    </li>
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
