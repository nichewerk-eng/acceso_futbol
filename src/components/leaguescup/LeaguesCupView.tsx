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
import { useGravity } from '@/contexts/GravityContext';
import { startLivePoll } from '@/lib/client/livePoll';
import { paceFromFixtures, type FreshPace } from '@/lib/sports/freshness';
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

type Props = {
  initialFixtures: Fixture[];
};

export default function LeaguesCupView({ initialFixtures }: Props) {
  const { matchesGravity } = useGravity();
  const [fixtures, setFixtures] = useState(initialFixtures);
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

  const { live, phaseOneByDay, knockout } = useMemo(() => {
    const liveRows: Fixture[] = [];
    const phase: Fixture[] = [];
    const ko: Fixture[] = [];
    for (const f of fixtures) {
      if (f.id.startsWith('lc-') || (f.jornada && /final|semifinal|quarter|third|tercer/i.test(f.jornada))) {
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
            Sedes y horarios del calendario oficial. Todo en Apple TV; selectos en TV abierta.
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

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6 sm:py-12">
        {fixtures.length === 0 ? (
          <div className="border border-line px-5 py-10" data-testid="lc-empty">
            <p className="font-display text-2xl font-bold uppercase tracking-wide">
              Ventana Leagues Cup
            </p>
            <p className="mt-3 max-w-lg font-mono text-[12px] leading-6 text-muted">
              La rivalidad binacional arranca el 4 de agosto. Mientras tanto, el pulso sigue en
              Liga MX y la cabina de hoy.
            </p>
            <Link href="/#hoy" className="af-cta mt-6 inline-flex">
              Ir a cabina
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

            <section data-testid="lc-bracket">
              <h2 className="af-tele mb-2 text-foreground">Eliminación</h2>
              <p className="mb-6 font-mono text-[11px] text-muted">
                Cuartos (25–27 ago) · Semis (1–2 sep) · Tercer lugar y Final (6 sep)
              </p>
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
          </>
        )}
      </div>
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
  const score =
    f.state === 'pre'
      ? fmtTime(f.date, tz)
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
          <p className="mt-1 font-mono text-[11px] text-muted">{fmtTime(f.date, tz)}</p>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={f.home.id}
            name={f.home.name}
            logoUrl={f.home.logo}
            size="sm"
          />
          <span className="truncate font-display text-sm font-bold uppercase tracking-wide sm:text-base">
            {f.home.abbreviation}
          </span>
          <span className="af-tele shrink-0 text-signal">{score}</span>
          <span className="truncate font-display text-sm font-bold uppercase tracking-wide sm:text-base">
            {f.away.abbreviation}
          </span>
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={f.away.id}
            name={f.away.name}
            logoUrl={f.away.logo}
            size="sm"
          />
        </div>

        <div className="hidden w-full flex-col items-end gap-1 sm:flex sm:w-auto">
          {mine && <span className="af-tele text-signal">TU CLUB</span>}
          {f.venue && (
            <p className="max-w-[14rem] truncate text-right font-mono text-[10px] text-muted">
              {f.venue}
            </p>
          )}
          <BroadcastChannels
            mx={f.dondeVer?.mxChannels}
            us={f.dondeVer?.usChannels}
            mxLabel={f.dondeVer?.mx}
            usLabel={f.dondeVer?.us}
            compact
          />
        </div>
      </Link>
    </li>
  );
}
