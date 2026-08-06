'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import { useGravity } from '@/contexts/GravityContext';
import { startLivePoll } from '@/lib/client/livePoll';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
import {
  buildLeaguesCupStandingsFromFixtures,
  LC_KO_SPOTS,
  type LcStandingEntry,
  type LcStandingsPayload,
} from '@/lib/sports/leaguesCupStandings';
import type { Fixture } from '@/lib/sports/types';

function dayKeyInTz(d: Date, tz: string) {
  return d.toLocaleDateString('en-CA', { timeZone: tz });
}

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  });
}

const STANDINGS_GRID = 'lc-standings-grid';

type Props = {
  initialFixtures: Fixture[];
};

export default function LeaguesCupView({ initialFixtures }: Props) {
  const { matchesGravity } = useGravity();
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [tab, setTab] = useState<'partidos' | 'tabla' | 'bracket'>('partidos');
  const [refreshing, setRefreshing] = useState(false);
  const [userTz, setUserTz] = useState('America/Mexico_City');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  const paceRef = useRef<FreshPace>('near');

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/leagues-cup/fixtures');
      if (res.ok) {
        const d = (await res.json()) as { fixtures?: Fixture[] };
        const next = d.fixtures ?? [];
        setFixtures(next);
        paceRef.current = paceFromFixtures(next.filter((f) => !f.id.startsWith('lc-')));
      }
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(
    () => startLivePoll(() => void refresh(true), { getPace: () => paceRef.current }),
    [refresh]
  );

  const todayKey = useMemo(() => dayKeyInTz(new Date(), userTz), [userTz]);

  const standings = useMemo(
    () => buildLeaguesCupStandingsFromFixtures(fixtures),
    [fixtures]
  );

  const { live, phaseOneByDay, knockout } = useMemo(() => {
    const liveRows: Fixture[] = [];
    const phase: Fixture[] = [];
    const ko: Fixture[] = [];
    for (const f of fixtures) {
      if (
        f.id.startsWith('lc-') ||
        (f.jornada && /final|semifinal|quarter|third|tercer/i.test(f.jornada))
      ) {
        ko.push(f);
        continue;
      }
      if (f.state === 'in') liveRows.push(f);
      phase.push(f);
    }
    const byDay = new Map<string, Fixture[]>();
    for (const f of phase) {
      const day = f.scheduleDay ?? dayKeyInTz(new Date(f.date), userTz);
      const list = byDay.get(day) ?? [];
      list.push(f);
      byDay.set(day, list);
    }
    const phaseOneByDay = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, rows]) => {
        const anchor = `${day}T12:00:00.000Z`;
        return {
          day,
          label: new Date(anchor).toLocaleDateString('es-MX', {
            timeZone: 'UTC',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
          month: new Date(anchor).toLocaleDateString('es-MX', {
            timeZone: 'UTC',
            month: 'long',
            year: 'numeric',
          }),
          rows: rows.sort((a, b) => +new Date(a.date) - +new Date(b.date)),
        };
      });
    return { live: liveRows, phaseOneByDay, knockout: ko };
  }, [fixtures, userTz]);

  const phaseCount = phaseOneByDay.reduce((n, d) => n + d.rows.length, 0);

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  let lastMonth = '';

  return (
    <div data-testid="page-leagues-cup" className="bg-bg-1 text-foreground">
      <section className="border-b border-line px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="af-tele text-signal">AF://LEAGUES CUP</p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
            Leagues Cup
          </h1>
          <p className="mt-3 max-w-xl font-mono text-[12px] leading-6 text-muted">
            MLS × Liga MX. Fase 1 del 4 al 13 de agosto; eliminación hasta el 6 de septiembre.
            Top 4 de cada tabla pasan a cuartos. Todo en Apple TV; selectos en TV abierta.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refresh(false)}
              className="af-cta af-cta-ghost !py-2"
              disabled={refreshing}
              data-testid="lc-refresh"
            >
              {refreshing ? 'Sync…' : 'Actualizar'}
            </button>
            <p className="af-tele text-muted">
              {phaseCount > 0 ? `${phaseCount} Fase 1 · ${knockout.length} KO` : 'Sin calendario'}
            </p>
          </div>
        </div>
      </section>

      <div className="border-b border-line px-4 sm:px-6">
        <div
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto py-3"
          data-testid="lc-tabs"
          role="tablist"
        >
          {(
            [
              ['partidos', 'Partidos'],
              ['tabla', 'Tabla'],
              ['bracket', 'Bracket'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              data-testid={`lc-tab-${id}`}
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

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 sm:py-12">
        {tab === 'tabla' && (
          <LcTabla standings={standings} matchesGravity={matchesGravity} />
        )}

        {tab === 'bracket' && (
          <section data-testid="lc-bracket">
            <div className="mb-6 border-b border-line pb-4">
              <p className="af-tele text-foreground">
                <span className="text-signal">AF</span>
                ://BRACKET
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                Ronda eliminatoria
              </h2>
              <p className="mt-3 font-mono text-[11px] text-muted">
                Cuartos (25–27 ago) · Semis (1–2 sep) · Tercer lugar y Final (6 sep)
              </p>
            </div>
            <div className="space-y-6">
              {(
                [
                  ['Quarterfinals', 'Cuartos de final'],
                  ['Semifinals', 'Semifinales'],
                  ['Third Place Match', 'Tercer lugar'],
                  ['Final', 'Final'],
                ] as const
              ).map(([stage, title]) => {
                const rows = knockout.filter((f) => f.jornada === stage);
                if (!rows.length) return null;
                return (
                  <div key={stage}>
                    <h3 className="af-tele mb-2 text-signal">{title}</h3>
                    <ul className="divide-y divide-line border-y border-line">
                      {rows.map((f) => (
                        <KnockoutRow key={f.id} f={f} tz={userTz} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'partidos' &&
          (fixtures.length === 0 ? (
            <div className="border border-line px-5 py-10" data-testid="lc-empty">
              <p className="font-display text-2xl font-bold uppercase tracking-wide">
                Ventana Leagues Cup
              </p>
              <p className="mt-3 max-w-lg font-mono text-[12px] leading-6 text-muted">
                La rivalidad binacional arranca el 4 de agosto. Mientras tanto, el pulso sigue en
                Liga MX y el pulso de la jornada.
              </p>
              <Link href="/#jornada" className="af-cta mt-6 inline-flex">
                Ir al pulso
              </Link>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <BoardBlock title="En vivo" testId="lc-live">
                  {live.map((f) => (
                    <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} live />
                  ))}
                </BoardBlock>
              )}

              <section data-testid="lc-fase-1">
                <h2 className="af-tele mb-2 text-foreground">Fase 1</h2>
                <p className="mb-6 font-mono text-[11px] text-muted">
                  4–13 agosto · 54 partidos MLS vs Liga MX
                </p>
                <div className="space-y-8">
                  {phaseOneByDay.map((group) => {
                    const showMonth = group.month !== lastMonth;
                    lastMonth = group.month;
                    const isToday = group.day === todayKey;
                    return (
                      <div key={group.day} data-testid={`lc-day-${group.day}`}>
                        {showMonth && (
                          <p className="mb-3 font-display text-xl font-bold uppercase tracking-wide">
                            {group.month}
                          </p>
                        )}
                        <div className="mb-2 flex items-baseline gap-3">
                          <h3 className="af-tele text-signal">{group.label}</h3>
                          {isToday && <span className="af-chip text-signal">Hoy</span>}
                        </div>
                        <ul className="divide-y divide-line border-y border-line">
                          {group.rows.map((f) => (
                            <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ))}
      </div>
    </div>
  );
}

function LcTabla({
  standings,
  matchesGravity,
}: {
  standings: LcStandingsPayload;
  matchesGravity: (
    homeName: string,
    awayName: string,
    homeAbbr?: string,
    awayAbbr?: string
  ) => boolean;
}) {
  return (
    <section data-testid="lc-tabla" className="space-y-12">
      <div className="border-b border-line pb-4">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://TABLA
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          Primera fase · Clasificación
        </h2>
        <p className="mt-3 max-w-2xl font-mono text-[11px] leading-5 text-muted">
          Victoria reglamentaria 3 pts · penales ganados 2 · penales perdidos 1. Top{' '}
          {LC_KO_SPOTS} de cada liga avanza a la fase eliminatoria.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Legend mark="signal" label="a · avanza" />
          <Legend mark="signal" label="x · 1º asegurado" />
          <Legend mark="ink" label="e · eliminado" />
        </div>
      </div>

      <StandingsTable
        title="Liga MX"
        testId="lc-tabla-ligamx"
        entries={standings.ligaMx}
        matchesGravity={matchesGravity}
      />
      <StandingsTable
        title="MLS"
        testId="lc-tabla-mls"
        entries={standings.mls}
        matchesGravity={matchesGravity}
      />

      <aside className="border border-line bg-bg-2 px-4 py-5 sm:px-5" data-testid="lc-tabla-rules">
        <p className="af-tele text-foreground">Puntos</p>
        <ul className="mt-3 space-y-2 font-mono text-[11px] leading-5 text-muted">
          <li>Victoria en tiempo reglamentario → 3 puntos</li>
          <li>Derrota en tiempo reglamentario → 0 puntos</li>
          <li>Empate en reglamentario → penales: ganador 2 pts · perdedor 1 pt</li>
        </ul>
        <p className="af-tele mt-5 text-foreground">Desempates</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 font-mono text-[11px] leading-5 text-muted">
          <li>Mayor diferencia de goles (Dif)</li>
          <li>Más victorias en tiempo reglamentario (PG)</li>
          <li>Más goles marcados (TG)</li>
          <li>Menos goles recibidos (GA)</li>
          <li>Juego limpio · luego sorteo del Comité</li>
        </ol>
        <p className="af-tele mt-5 text-foreground">Clave</p>
        <p className="mt-2 font-mono text-[11px] leading-5 text-muted">
          <span className="text-signal">x</span> primer lugar asegurado ·{' '}
          <span className="text-signal">a</span> avanza a eliminatoria ·{' '}
          <span className="text-muted">e</span> eliminado
        </p>
      </aside>
    </section>
  );
}

function StandingsTable({
  title,
  testId,
  entries,
  matchesGravity,
}: {
  title: string;
  testId: string;
  entries: LcStandingEntry[];
  matchesGravity: (
    homeName: string,
    awayName: string,
    homeAbbr?: string,
    awayAbbr?: string
  ) => boolean;
}) {
  return (
    <div data-testid={testId}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-display text-xl font-bold uppercase tracking-wide">{title}</h3>
        <p className="af-tele text-muted">{entries.length} clubes</p>
      </div>
      <div className="border border-line bg-bg-2">
        <div className={[STANDINGS_GRID, 'border-b border-line py-2 af-tele'].join(' ')}>
          <span className="text-center">#</span>
          <span>Club</span>
          <span className="text-center" title="Puntos">
            Pts
          </span>
          <span className="text-center" title="Partidos jugados">
            PJ
          </span>
          <span className="text-center" title="Victorias reglamentarias">
            PG
          </span>
          <span className="lc-col-desktop text-center" title="Derrotas reglamentarias">
            PP
          </span>
          <span className="lc-col-desktop text-center" title="Penales ganados">
            PKW
          </span>
          <span className="lc-col-desktop text-center" title="Penales perdidos">
            PKL
          </span>
          <span className="lc-col-desktop text-center" title="Goles a favor">
            TG
          </span>
          <span className="lc-col-desktop text-center" title="Goles en contra">
            GA
          </span>
          <span className="text-center" title="Diferencia">
            Dif
          </span>
          <span className="text-center">Clave</span>
        </div>
        {entries.map((entry) => {
          const mine = matchesGravity(
            entry.team.name,
            entry.team.name,
            entry.team.abbreviation,
            entry.team.abbreviation
          );
          const advances = entry.mark === 'a' || entry.mark === 'x';
          return (
            <div
              key={entry.team.id || entry.team.abbreviation}
              data-testid={`lc-row-${entry.team.abbreviation}`}
              className={[
                STANDINGS_GRID,
                'border-b border-line py-2.5 text-sm last:border-b-0',
                advances ? 'bg-signal/[0.04]' : '',
                mine ? 'bg-foreground/[0.03]' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'text-center font-mono text-[11px] tabular-nums',
                  advances ? 'text-signal' : 'text-muted',
                ].join(' ')}
              >
                {entry.position}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                {(() => {
                  const slug = ligaMxClubIdFromAbbr(entry.team.abbreviation);
                  const inner = (
                    <>
                      <ClubLogo
                        abbr={entry.team.abbreviation}
                        name={entry.team.name}
                        logoUrl={entry.team.logo}
                        size="sm"
                      />
                      <span className="truncate">
                        <span className="club-word club-word-sm sm:hidden">
                          {entry.team.abbreviation}
                        </span>
                        <span className="hidden font-display text-base font-bold uppercase tracking-wide sm:inline">
                          {entry.team.name}
                        </span>
                      </span>
                    </>
                  );
                  return slug ? (
                    <Link
                      href={`/club/${slug}`}
                      className="flex min-w-0 items-center gap-2 transition hover:opacity-90"
                      data-testid={`lc-club-${slug}`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    inner
                  );
                })()}
                {mine && <span className="af-tele shrink-0 text-signal">TU</span>}
              </span>
              <span className="text-center font-semibold tabular-nums">{entry.pts}</span>
              <span className="text-center tabular-nums text-muted">{entry.gp}</span>
              <span className="text-center tabular-nums">{entry.w}</span>
              <span className="lc-col-desktop text-center tabular-nums text-muted">{entry.l}</span>
              <span className="lc-col-desktop text-center tabular-nums text-muted">{entry.pw}</span>
              <span className="lc-col-desktop text-center tabular-nums text-muted">{entry.pl}</span>
              <span className="lc-col-desktop text-center tabular-nums text-muted">{entry.gf}</span>
              <span className="lc-col-desktop text-center tabular-nums text-muted">{entry.ga}</span>
              <span className="text-center tabular-nums">
                {entry.gd > 0 ? `+${entry.gd}` : entry.gd}
              </span>
              <span
                className={[
                  'text-center font-mono text-[10px] uppercase tracking-[0.12em]',
                  entry.mark === 'e' ? 'text-muted' : 'text-signal',
                ].join(' ')}
              >
                {entry.mark ?? '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ mark, label }: { mark: 'signal' | 'ink'; label: string }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
      <span
        className={[
          'inline-block h-2 w-2',
          mark === 'signal' ? 'bg-signal' : 'bg-line',
        ].join(' ')}
        aria-hidden
      />
      {label}
    </p>
  );
}

function BoardBlock({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children?: ReactNode;
}) {
  return (
    <section data-testid={testId}>
      <h2 className="af-tele mb-4 text-foreground">{title}</h2>
      <ul className="divide-y divide-line border-y border-line">{children}</ul>
    </section>
  );
}

function KnockoutRow({ f }: { f: Fixture; tz: string }) {
  const tbd = f.home.abbreviation === 'TBC';
  const dateLabel = f.scheduleDay
    ? new Date(`${f.scheduleDay}T12:00:00.000Z`).toLocaleDateString('es-MX', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
      })
    : 'Por anunciar';
  return (
    <li
      className="flex flex-wrap items-center gap-3 py-4 sm:gap-4"
      data-testid={`lc-ko-${f.id}`}
    >
      <div className="min-w-[5.5rem] shrink-0">
        <p className="af-tele text-muted">{f.jornada}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">{dateLabel}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <span className="font-display text-sm font-bold uppercase tracking-wide">
          {tbd ? 'TBC' : f.home.abbreviation}
        </span>
        <span className="af-tele text-signal">TBD</span>
        <span className="font-display text-sm font-bold uppercase tracking-wide">
          {tbd ? 'TBC' : f.away.abbreviation}
        </span>
      </div>
      <p className="w-full font-mono text-[11px] text-muted sm:w-auto sm:text-right">
        {f.venue ?? 'TBC'}
      </p>
    </li>
  );
}

function MatchRow({
  f,
  tz,
  mine,
  live,
}: {
  f: Fixture;
  tz: string;
  mine: boolean;
  live?: boolean;
}) {
  const href = `/partido/leagues-cup/${f.id}`;
  // ESPN / LeaguesCup.com list venue-local wall times — match that, not browser TZ.
  const kickTz = f.venueTz || tz;
  const score =
    f.state === 'pre'
      ? fmtTime(f.date, kickTz)
      : `${f.home.score ?? '0'}–${f.away.score ?? '0'}`;
  const clockStamp =
    f.state === 'in'
      ? f.clock === 'HT' || /descanso/i.test(f.statusLabel || '')
        ? 'HT'
        : f.clock || 'LIVE'
      : f.state === 'post'
        ? 'FT'
        : null;

  return (
    <li>
      <Link
        href={href}
        data-testid={`lc-match-${f.id}`}
        className="flex flex-wrap items-center gap-3 py-4 transition hover:bg-bg-2/60 sm:gap-4"
      >
        <div className="min-w-[5.5rem] shrink-0">
          <p className="af-tele text-muted">
            {live && <span className="hoy-live-dot mr-1.5" aria-hidden />}
            {clockStamp ?? f.jornada ?? 'Fase 1'}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted">{fmtTime(f.date, kickTz)}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={f.home.id}
            name={f.home.name}
            logoUrl={f.home.logo}
            size="sm"
          />
          <span className="club-word club-word-sm truncate">{f.home.abbreviation}</span>
          <span className="af-tele shrink-0 text-signal">{score}</span>
          <span className="club-word club-word-sm truncate">{f.away.abbreviation}</span>
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={f.away.id}
            name={f.away.name}
            logoUrl={f.away.logo}
            size="sm"
          />
        </div>

        <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
          {mine && (
            <span className="af-tele hidden text-signal sm:inline">TU CLUB</span>
          )}
          {f.venue && (
            <p className="hidden max-w-[12rem] truncate text-right font-mono text-[10px] text-muted sm:block">
              {f.venue}
            </p>
          )}
          <BroadcastChannels
            className="tv-inline-desk"
            mx={f.dondeVer?.mxChannels}
            us={f.dondeVer?.usChannels}
            mxLabel={f.dondeVer?.mx}
            usLabel={f.dondeVer?.us}
            compact
            inline
          />
        </div>
      </Link>
    </li>
  );
}
