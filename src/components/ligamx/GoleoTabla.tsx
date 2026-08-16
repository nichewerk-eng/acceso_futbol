'use client';

import Link from 'next/link';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import type { GoleoBoard, GoleoEntry } from '@/lib/sports/leaders';

const GRID = 'lm-goleo-grid';

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length <= 1 ? name : parts.slice(-1)[0];
}

function GoleoRow({
  e,
  unit,
  mine,
}: {
  e: GoleoEntry;
  unit: string;
  mine: boolean;
}) {
  const club = e.teamAbbr ? clubIdentityFromAbbr(e.teamAbbr) : null;
  const team = (
    <span className="flex min-w-0 items-center gap-2">
      <ClubLogo
        abbr={e.teamAbbr}
        clubId={club?.id}
        name={e.teamName}
        logoUrl={e.teamLogo}
        size="sm"
      />
      <span className="hidden truncate font-display text-base font-bold uppercase tracking-wide sm:inline">
        {e.teamName ?? e.teamAbbr ?? '—'}
      </span>
      <span className="font-display text-sm font-bold uppercase tracking-wide sm:hidden">
        {e.teamAbbr ?? '—'}
      </span>
    </span>
  );

  return (
    <div
      className={[
        GRID,
        'border-t border-line py-3 transition hover:bg-bg-3',
        e.rank === 1 ? 'shadow-[inset_3px_0_0_var(--signal)]' : '',
        mine ? 'bg-signal/5' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        className={[
          'text-center font-display text-sm font-bold tabular-nums',
          e.rank === 1 ? 'text-signal' : 'text-muted',
        ].join(' ')}
      >
        {e.rank}
      </span>
      <span className="min-w-0 truncate font-display text-sm font-bold uppercase tracking-wide sm:text-base">
        {e.name}
        {mine ? <span className="ml-2 af-tele !text-signal">LOCK</span> : null}
      </span>
      {club ? (
        <Link href={`/club/${club.id}`} className="min-w-0 transition hover:opacity-90">
          {team}
        </Link>
      ) : (
        team
      )}
      <span className="lm-col-desktop text-center text-xs tabular-nums text-muted">
        {e.games ?? '—'}
      </span>
      <span
        className="text-center font-display text-sm font-bold tabular-nums sm:text-base"
        title={unit}
      >
        {e.value}
      </span>
    </div>
  );
}

function Table({
  kicker,
  title,
  unit,
  entries,
  isMine,
}: {
  kicker: string;
  title: string;
  unit: string;
  entries: GoleoEntry[];
  isMine: (abbr?: string) => boolean;
}) {
  if (!entries.length) return null;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://{kicker}
          </p>
          <h3 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide">{title}</h3>
        </div>
        <span className="af-tele">{unit}</span>
      </div>
      <div className="border border-line bg-bg-2">
        <div className={[GRID, 'border-b border-line py-2 af-tele'].join(' ')}>
          <span className="text-center">#</span>
          <span>Jugador</span>
          <span>Club</span>
          <span className="lm-col-desktop text-center">PJ</span>
          <span className="text-center">{unit}</span>
        </div>
        {entries.map((e) => (
          <GoleoRow
            key={`${e.athleteId}-${e.rank}`}
            e={e}
            unit={unit}
            mine={isMine(e.teamAbbr)}
          />
        ))}
      </div>
    </div>
  );
}

export function GoleoTabla({
  board,
  isMine,
}: {
  board: GoleoBoard | null;
  isMine: (abbr?: string) => boolean;
}) {
  if (!board || (!board.goals.length && !board.assists.length)) {
    return (
      <div className="border border-line bg-bg-2 px-6 py-14 text-center">
        <p className="font-display text-2xl font-bold uppercase tracking-wide">Goleo</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
          El goleo se actualiza en cuanto avance la jornada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10" data-testid="ligamx-goleo">
      <Table
        kicker="GOLES"
        title="Goleo"
        unit="Goles"
        entries={board.goals.slice(0, 5)}
        isMine={isMine}
      />
      <Table
        kicker="ASISTENCIAS"
        title="Asistencias"
        unit="Asist."
        entries={board.assists.slice(0, 5)}
        isMine={isMine}
      />
      <p className="font-mono text-[11px] leading-5 text-muted">
        {board.seasonLabel} · fuente ESPN.{' '}
        <Link href="/goleo" className="text-foreground underline-offset-2 hover:underline">
          Página de goleo
        </Link>
      </p>
    </div>
  );
}

export function GoleoRailCard({
  board,
  isMine,
}: {
  board: GoleoBoard | null;
  isMine: (abbr?: string) => boolean;
}) {
  const rows = board?.goals.slice(0, 5) ?? [];
  return (
    <div className="lc-rail-block lc-clasificacion" data-testid="ligamx-rail-goleo">
      <div className="lc-rail-block-head">
        <p className="af-tele text-foreground">Goleo</p>
        <Link href="/goleo" className="lc-rail-link">
          Tabla completa
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="lc-rail-note">El goleo llega con la jornada.</p>
      ) : (
        <>
          <p className="lc-rail-note">{board?.seasonLabel ?? 'Apertura'} · goles</p>
          <div className="lc-rail-mini">
            <div className="lc-rail-mini-head">
              <h4>Goleadores</h4>
              <span className="af-tele text-muted">G</span>
            </div>
            <ul className="lc-rail-mini-list">
              {rows.map((e) => {
                const mine = isMine(e.teamAbbr);
                const club = e.teamAbbr ? clubIdentityFromAbbr(e.teamAbbr) : null;
                return (
                  <li
                    key={`${e.athleteId}-${e.rank}`}
                    className={['lc-rail-mini-row', mine ? 'lc-rail-mini-mine' : '']
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="lc-rail-mini-pos">{e.rank}</span>
                    <ClubLogo
                      abbr={e.teamAbbr}
                      clubId={club?.id}
                      name={e.teamName}
                      logoUrl={e.teamLogo}
                      size="xs"
                    />
                    <span className="lc-rail-mini-abbr" title={e.name}>
                      {lastName(e.name)}
                    </span>
                    <span className="lc-rail-mini-mark" aria-hidden />
                    <span className="lc-rail-mini-pts">{e.value}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
