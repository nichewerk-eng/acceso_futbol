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

function fmtDay(iso: string, tz: string) {
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
        paceRef.current = paceFromFixtures(next);
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

  const { live, tonight, upcoming, played } = useMemo(() => {
    const liveRows: Fixture[] = [];
    const tonightRows: Fixture[] = [];
    const upcomingRows: Fixture[] = [];
    const playedRows: Fixture[] = [];
    for (const f of fixtures) {
      const day = dayKeyInTz(new Date(f.date), userTz);
      if (f.state === 'in') liveRows.push(f);
      else if (f.state === 'post') playedRows.push(f);
      else if (day === todayKey) tonightRows.push(f);
      else if (day > todayKey) upcomingRows.push(f);
      else playedRows.push(f);
    }
    playedRows.reverse();
    return {
      live: liveRows,
      tonight: tonightRows,
      upcoming: upcomingRows.slice(0, 24),
      played: playedRows.slice(0, 12),
    };
  }, [fixtures, todayKey, userTz]);

  const isMine = (f: Fixture) =>
    matchesGravity(f.home.name, f.away.name, f.home.abbreviation, f.away.abbreviation);

  return (
    <div data-testid="page-leagues-cup" className="bg-bg-1 text-foreground">
      <section className="border-b border-line px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <p className="af-tele text-signal">AF://LEAGUES CUP</p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
            Leagues Cup
          </h1>
          <p className="mt-3 max-w-xl font-mono text-[12px] leading-6 text-muted">
            MLS × Liga MX. Solo partidos con clubes mexicanos. Fase 1 del 4 al 12 de agosto;
            eliminación hasta el 6 de septiembre. Todo en Apple TV; selectos en TV abierta.
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
              {fixtures.length > 0 ? `${fixtures.length} fichas MX` : 'Sin calendario'}
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

            <BoardBlock
              title={tonight.length > 0 ? 'Esta noche' : 'Hoy'}
              testId="lc-tonight"
              empty={
                tonight.length === 0
                  ? 'Sin partidos MX esta noche. Revisa próximos o vuelve al pulso Liga MX.'
                  : undefined
              }
            >
              {tonight.map((f) => (
                <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} />
              ))}
            </BoardBlock>

            <BoardBlock title="Próximos" testId="lc-upcoming">
              {upcoming.map((f) => (
                <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} />
              ))}
            </BoardBlock>

            {played.length > 0 && (
              <BoardBlock title="Recientes" testId="lc-played">
                {played.map((f) => (
                  <MatchRow key={f.id} f={f} tz={userTz} mine={isMine(f)} />
                ))}
              </BoardBlock>
            )}
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
  empty,
}: {
  title: string;
  testId: string;
  children?: ReactNode;
  empty?: string;
}) {
  const hasKids = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section data-testid={testId}>
      <h2 className="af-tele mb-4 text-foreground">{title}</h2>
      {!hasKids && empty ? (
        <p className="font-mono text-[12px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">{children}</ul>
      )}
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
            {clockStamp ?? f.jornada ?? 'LC'}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted">{fmtDay(f.date, tz)}</p>
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

        <div className="hidden w-full items-center justify-between gap-3 sm:flex sm:w-auto sm:flex-col sm:items-end">
          {mine && <span className="af-tele text-signal">TU CLUB</span>}
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
