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
import { LcBracket } from '@/components/leaguescup/LcBracket';
import { BroadcastChannels } from '@/components/brand/BroadcastChannels';
import { LeaguesCupMark } from '@/components/brand/LeaguesCupMark';
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
  // Compact 24h stamp — scans cleaner in the scoreboard center.
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Condensed club label for match bands (full name when short, else abbr). */
function bandName(name: string, abbr: string) {
  const cleaned = name
    .replace(/\b(F\.?C\.?|C\.?F\.?|S\.?C\.?|Club|Deportivo|CF)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return abbr;
  // Keep bands readable — long MLS names collapse to abbr on the rail.
  if (cleaned.length > 14) return abbr;
  return cleaned;
}

const STANDINGS_GRID = 'lc-standings-grid';

type Props = {
  initialFixtures: Fixture[];
};

export default function LeaguesCupView({ initialFixtures }: Props) {
  const { matchesGravity, club } = useGravity();
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

  const { live, porJugarByDay, jugadosByDay, knockout, phaseCount } = useMemo(() => {
    const liveRows: Fixture[] = [];
    const phase: Fixture[] = [];
    const ko: Fixture[] = [];
    const calendar: Fixture[] = [];
    for (const f of fixtures) {
      const isKo =
        f.id.startsWith('lc-') ||
        Boolean(f.jornada && /final|semifinal|quarter|third|tercer/i.test(f.jornada));
      if (isKo) ko.push(f);
      else phase.push(f);

      const onCalendar =
        !isKo ||
        f.statusLabel === 'Programado' ||
        f.state === 'in' ||
        f.state === 'post';
      if (!onCalendar) continue;
      if (f.state === 'in') liveRows.push(f);
      calendar.push(f);
    }

    type DayGroup = {
      day: string;
      label: string;
      rows: Fixture[];
    };

    const toGroups = (
      rows: Fixture[],
      sortDays: (a: string, b: string) => number
    ): DayGroup[] => {
      const byDay = new Map<string, Fixture[]>();
      for (const f of rows) {
        const day = dayKeyInTz(new Date(f.date), userTz);
        const list = byDay.get(day) ?? [];
        list.push(f);
        byDay.set(day, list);
      }
      return [...byDay.entries()]
        .sort(([a], [b]) => sortDays(a, b))
        .map(([day, dayRows]) => {
          const anchor = `${day}T12:00:00.000Z`;
          return {
            day,
            label: new Date(anchor).toLocaleDateString('es-MX', {
              timeZone: 'UTC',
              day: 'numeric',
              month: 'long',
            }),
            rows: dayRows.sort((a, b) => +new Date(a.date) - +new Date(b.date)),
          };
        });
    };

    // Live sits in its own block — Por jugar is kickoffs still pending.
    const upcoming = calendar.filter((f) => f.state === 'pre');
    const played = calendar.filter((f) => f.state === 'post');

    const porJugarByDay = toGroups(upcoming, (a, b) => {
      // Hoy first, then upcoming days ascending.
      if (a === todayKey) return -1;
      if (b === todayKey) return 1;
      return a.localeCompare(b);
    });
    const jugadosByDay = toGroups(played, (a, b) => {
      // Hoy first, then past days newest first.
      if (a === todayKey) return -1;
      if (b === todayKey) return 1;
      return b.localeCompare(a);
    });

    return {
      live: liveRows,
      porJugarByDay,
      jugadosByDay,
      knockout: ko,
      phaseCount: phase.length,
    };
  }, [fixtures, userTz, todayKey]);

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  return (
    <div data-testid="page-leagues-cup" className="bg-bg-1 text-foreground">
      <section className="border-b border-line px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="af-tele text-signal">AF://LEAGUES CUP</p>
          <h1 className="sr-only">Leagues Cup</h1>
          <LeaguesCupMark size="lg" priority className="lc-hero-mark mt-4" />
          <p className="mt-4 max-w-xl font-mono text-[12px] leading-6 text-muted">
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
                Cuartos (25–26 ago) · Semis (1–2 sep) · Tercer lugar y Final (6 sep)
              </p>
            </div>
            <LcBracket fixtures={knockout} isMine={isMine} />
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
            <div className="lc-partidos-layout" data-testid="lc-partidos-layout">
              <div className="lc-partidos-main">
                {live.length > 0 && (
                  <BoardBlock title="En vivo" testId="lc-live">
                    {live.map((f) => (
                      <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} live />
                    ))}
                  </BoardBlock>
                )}

                <div className="lc-mobile-tabla">
                  <LcClasificacionCard
                    standings={standings}
                    matchesGravity={matchesGravity}
                    onOpenTabla={() => setTab('tabla')}
                  />
                </div>

                <section data-testid="lc-fase-1" className="lc-board">
                  {porJugarByDay.length > 0 && (
                    <div className="lc-section" data-testid="lc-por-jugar">
                      {porJugarByDay.some((g) =>
                        g.rows.some((f) => f.jornada === 'Quarterfinals')
                      ) ? (
                        <div className="lc-section-head">
                          <h3 className="af-tele text-signal">Cuartos de final</h3>
                        </div>
                      ) : null}
                      <LcDayGroups
                        groups={porJugarByDay}
                        todayKey={todayKey}
                        userTz={userTz}
                        isMine={isMine}
                        testIdPrefix="upcoming"
                      />
                    </div>
                  )}

                  {jugadosByDay.length > 0 && (
                    <div className="lc-section" data-testid="lc-jugados">
                      <LcDayGroups
                        groups={jugadosByDay}
                        todayKey={todayKey}
                        userTz={userTz}
                        isMine={isMine}
                        testIdPrefix="played"
                      />
                    </div>
                  )}
                </section>
              </div>

              <LcPartidosRail
                standings={standings}
                porJugarByDay={porJugarByDay}
                userTz={userTz}
                clubName={club?.name ?? null}
                clubAbbr={club?.abbreviation ?? null}
                matchesGravity={matchesGravity}
                onOpenTabla={() => setTab('tabla')}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

function LcPartidosRail({
  standings,
  porJugarByDay,
  userTz,
  clubName,
  clubAbbr,
  matchesGravity,
  onOpenTabla,
}: {
  standings: LcStandingsPayload;
  porJugarByDay: { day: string; label: string; rows: Fixture[] }[];
  userTz: string;
  clubName: string | null;
  clubAbbr: string | null;
  matchesGravity: (
    homeName: string,
    awayName: string,
    homeAbbr?: string,
    awayAbbr?: string
  ) => boolean;
  onOpenTabla: () => void;
}) {
  const myEntry = useMemo(() => {
    if (!clubName && !clubAbbr) return null;
    const all = [...standings.ligaMx, ...standings.mls];
    return (
      all.find((e) =>
        matchesGravity(e.team.name, e.team.name, e.team.abbreviation, e.team.abbreviation)
      ) ?? null
    );
  }, [clubName, clubAbbr, standings, matchesGravity]);

  const myLeague = myEntry
    ? standings.ligaMx.some((e) => e.team.abbreviation === myEntry.team.abbreviation)
      ? 'Liga MX'
      : 'MLS'
    : null;

  const myNext = useMemo(() => {
    if (!clubName && !clubAbbr) return null;
    for (const g of porJugarByDay) {
      const hit = g.rows.find((f) =>
        matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation)
      );
      if (hit) return hit;
    }
    return null;
  }, [clubName, clubAbbr, porJugarByDay, matchesGravity]);

  const markLabel = (mark?: 'x' | 'a' | 'e' | null) => {
    if (mark === 'x') return '1º asegurado';
    if (mark === 'a') return 'Avanza';
    if (mark === 'e') return 'Eliminado';
    return 'En carrera';
  };

  return (
    <aside className="lc-rail" data-testid="lc-rail">
      {myEntry && (
        <div className="lc-rail-block lc-rail-mine" data-testid="lc-rail-mine">
          <p className="af-tele text-signal">Tu club</p>
          <div className="lc-rail-mine-row">
            <ClubLogo
              abbr={myEntry.team.abbreviation}
              clubId={myEntry.team.id}
              name={myEntry.team.name}
              logoUrl={myEntry.team.logo}
              size="sm"
            />
            <div className="min-w-0">
              <p className="lc-rail-mine-name">{myEntry.team.abbreviation}</p>
              <p className="af-tele text-muted">
                {myLeague} · #{myEntry.position}
              </p>
            </div>
            <p className="lc-rail-mine-pts">
              <span>{myEntry.pts}</span>
              <span className="af-tele text-muted">pts</span>
            </p>
          </div>
          <p
            className={[
              'lc-rail-mine-mark',
              myEntry.mark === 'e' ? 'text-muted' : 'text-signal',
            ].join(' ')}
          >
            {markLabel(myEntry.mark)}
            {myEntry.gd !== 0 && (
              <span className="text-muted">
                {' '}
                · Dif {myEntry.gd > 0 ? `+${myEntry.gd}` : myEntry.gd}
              </span>
            )}
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

      <div className="lc-rail-tabla-desk">
        <LcClasificacionCard
          standings={standings}
          matchesGravity={matchesGravity}
          onOpenTabla={onOpenTabla}
        />
      </div>

      <div className="lc-rail-block" data-testid="lc-rail-tv">
        <p className="af-tele text-foreground">Dónde ver</p>
        <ul className="lc-rail-tv-list">
          <li>Todos los partidos en Apple TV</li>
          <li>Selectos también en TV abierta (MX / US)</li>
          <li>Canales en cada fila del calendario</li>
        </ul>
      </div>
    </aside>
  );
}

function LcClasificacionCard({
  standings,
  matchesGravity,
  onOpenTabla,
}: {
  standings: LcStandingsPayload;
  matchesGravity: (
    homeName: string,
    awayName: string,
    homeAbbr?: string,
    awayAbbr?: string
  ) => boolean;
  onOpenTabla: () => void;
}) {
  return (
    <div className="lc-rail-block lc-clasificacion" data-testid="lc-rail-tabla">
      <div className="lc-rail-block-head">
        <p className="af-tele text-foreground">Clasificación</p>
        <button type="button" className="lc-rail-link" onClick={onOpenTabla}>
          Tabla completa
        </button>
      </div>
      <p className="lc-rail-note">Top {LC_KO_SPOTS} de cada liga → cuartos</p>
      <div className="lc-clasificacion-grid">
        <RailMiniTable
          title="Liga MX"
          entries={standings.ligaMx}
          matchesGravity={matchesGravity}
        />
        <RailMiniTable title="MLS" entries={standings.mls} matchesGravity={matchesGravity} />
      </div>
    </div>
  );
}

function RailMiniTable({
  title,
  entries,
  matchesGravity,
}: {
  title: string;
  entries: LcStandingEntry[];
  matchesGravity: (
    homeName: string,
    awayName: string,
    homeAbbr?: string,
    awayAbbr?: string
  ) => boolean;
}) {
  const rows = entries.slice(0, LC_KO_SPOTS + 1);
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
          const cut = entry.position === LC_KO_SPOTS;
          return (
            <li
              key={entry.team.id || entry.team.abbreviation}
              className={[
                'lc-rail-mini-row',
                cut ? 'lc-rail-mini-cut' : '',
                entry.position > LC_KO_SPOTS ? 'lc-rail-mini-out' : '',
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
              <span className="lc-rail-mini-mark">{entry.mark ?? '·'}</span>
              <span className="lc-rail-mini-pts">{entry.pts}</span>
            </li>
          );
        })}
      </ul>
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

function LcDayGroups({
  groups,
  todayKey,
  userTz,
  isMine,
  testIdPrefix,
}: {
  groups: { day: string; label: string; rows: Fixture[] }[];
  todayKey: string;
  userTz: string;
  isMine: (f: Fixture) => boolean;
  testIdPrefix: string;
}) {
  return (
    <div className="lc-day-stack">
      {groups.map((group) => {
        const isToday = group.day === todayKey;
        return (
          <div
            key={group.day}
            data-testid={`lc-day-${testIdPrefix}-${group.day}`}
            className={['lc-day', isToday ? 'lc-day-today' : ''].filter(Boolean).join(' ')}
          >
            <div className="lc-day-head">
              {isToday && <span className="lc-day-kicker">Hoy</span>}
              <h4 className="lc-day-title">{group.label}</h4>
            </div>
            <ul className="lc-day-list">
              {group.rows.map((f) => (
                <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
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
    <section data-testid={testId} className="lc-board mb-10">
      <div className="lc-day-head">
        <h2 className="af-tele text-signal">{title}</h2>
      </div>
      <ul className="lc-day-list">{children}</ul>
    </section>
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
  const clickable = !f.id.startsWith('lc-');
  const kickTime = fmtTime(f.date, tz);
  const whenPrimary =
    f.state === 'in'
      ? f.clock === 'HT' || /descanso/i.test(f.statusLabel || '')
        ? 'HT'
        : f.clock || 'LIVE'
      : f.state === 'post'
        ? 'FT'
        : kickTime;
  const center = f.state === 'pre' ? 'VS' : `${f.home.score ?? '0'}–${f.away.score ?? '0'}`;
  const homeLabel = bandName(f.home.name, f.home.abbreviation);
  const awayLabel = bandName(f.away.name, f.away.abbreviation);

  const hasTv = Boolean(
    f.dondeVer?.mxChannels?.length ||
      f.dondeVer?.usChannels?.length ||
      f.dondeVer?.mx ||
      f.dondeVer?.us
  );

  const className = ['lc-match', live ? 'lc-match-live' : '', mine ? 'lc-match-mine' : '']
    .filter(Boolean)
    .join(' ');

  const body = (
    <>
        <span className="lc-match-home">
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={f.home.id}
            name={f.home.name}
            logoUrl={f.home.logo}
            size="sm"
          />
          <span className="lc-match-name" title={f.home.name}>
            {homeLabel}
          </span>
        </span>

        <div className="lc-match-mid">
          <div className="lc-match-when">
            <p className="lc-match-when-primary">
              {live && <span className="hoy-live-dot mr-1.5" aria-hidden />}
              {whenPrimary}
              {f.state === 'pre' ? <span className="lc-match-when-hrs"> hrs</span> : null}
            </p>
            {mine && <span className="lc-match-lock">TU CLUB</span>}
          </div>

          <span
            className={[
              'lc-match-center',
              f.state === 'pre' ? 'lc-match-center-vs' : 'lc-match-center-score',
            ].join(' ')}
          >
            {center}
          </span>

          {hasTv ? (
            <BroadcastChannels
              className="lc-match-tv tv-inline-desk"
              mx={f.dondeVer?.mxChannels}
              us={f.dondeVer?.usChannels}
              mxLabel={f.dondeVer?.mx}
              usLabel={f.dondeVer?.us}
              inline
              maxMarks={8}
            />
          ) : null}
        </div>

        <span className="lc-match-away">
          <span className="lc-match-name" title={f.away.name}>
            {awayLabel}
          </span>
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={f.away.id}
            name={f.away.name}
            logoUrl={f.away.logo}
            size="sm"
          />
        </span>

        {f.venue ? <p className="lc-match-venue">{f.venue}</p> : null}
    </>
  );

  return (
    <li className="lc-match-item">
      {clickable ? (
        <Link href={href} data-testid={`lc-match-${f.id}`} className={className} title={f.venue || undefined}>
          {body}
        </Link>
      ) : (
        <div data-testid={`lc-match-${f.id}`} className={className} title={f.venue || undefined}>
          {body}
        </div>
      )}
    </li>
  );
}
