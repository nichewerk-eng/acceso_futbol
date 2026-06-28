'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import { APERTURA_2026_FIXTURES, getCurrentJornada } from '@/fixtures/ligamx-apertura-2026';
import type { LigaMXTable, LigaMXEntry } from '@/app/api/ligamx/standings/route';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';

// ── Liga MX team colors/icons by abbreviation ────────────────────────────────
// Using initials as fallback since Liga MX logos aren't flag emojis
const TEAM_COLOR: Record<string, string> = {
  AME: '#f5b800', ATL: '#e00000', ALT: '#00539b', CAZ: '#003da5',
  JUA: '#c8102e', GDL: '#c8102e', LEO: '##8b0000', MTY: '#003087',
  NEC: '#cc0000', PAC: '#000000', PUE: '#004a97', PUM: '#003087',
  QRO: '#004a97', SAN: '#007f3f', SLP: '#003087', TIG: '#fdbe01',
  TIJ: '#000000', TOL: '#cc0000',
};
const teamInitial = (abbr: string) => abbr.slice(0, 3);
const teamFlag = (abbr: string) => {
  const color = TEAM_COLOR[abbr] ?? '#555';
  return `<span style="background:${color};color:#fff;font-size:10px;font-weight:800;padding:1px 4px;border-radius:3px;">${teamInitial(abbr)}</span>`;
};

// Simple text badge component
function TeamBadge({ abbr }: { abbr: string }) {
  const color = TEAM_COLOR[abbr] ?? '#555';
  return (
    <span
      style={{ background: color, color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em', flexShrink: 0 }}
    >
      {abbr}
    </span>
  );
}

void teamFlag; // exported for potential use

// Liguilla zones
const LIGUILLA_SPOTS  = 8;
const REPECHAJE_SPOTS = 4; // positions 9-12

function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Props {
  initialTable: LigaMXTable | null;
  initialFixtures: LigaMXFixture[];
}

export default function LigaMXView({ initialTable, initialFixtures }: Props) {
  // Merge server-fetched fixtures with static schedule as fallback
  const baseFixtures = initialFixtures.length > 0 ? initialFixtures : APERTURA_2026_FIXTURES;

  const [table, setTable]       = useState<LigaMXTable | null>(initialTable);
  const [fixtures, setFixtures] = useState<LigaMXFixture[]>(baseFixtures);
  const [tab, setTab]           = useState<'tabla' | 'jornada' | 'liguilla'>('tabla');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [userTz, setUserTz]     = useState('America/Mexico_City');
  const [selectedJornada, setSelectedJornada] = useState<number>(() => getCurrentJornada(baseFixtures));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [sr, fr] = await Promise.all([fetch('/api/ligamx/standings'), fetch('/api/ligamx/fixtures')]);
      if (sr.ok) { const d = await sr.json(); setTable(d); }
      if (fr.ok) { const d = await fr.json(); const f = d.fixtures ?? []; setFixtures(f.length > 0 ? f : APERTURA_2026_FIXTURES); }
      setLastUpdated(new Date());
    } finally { if (!silent) setRefreshing(false); }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => refresh(true), 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  const liveFixtures = fixtures.filter((f) => f.status.state === 'in');
  const todayFixtures = fixtures.filter((f) => {
    const d = new Date(f.date).toLocaleDateString('es-MX', { timeZone: userTz });
    const n = new Date().toLocaleDateString('es-MX', { timeZone: userTz });
    return d === n && f.status.state !== 'in';
  });

  // All 17 jornadas available for navigation
  const allJornadas = Array.from({ length: 17 }, (_, i) => i + 1);
  const jornadaFixtures = fixtures.filter((f) => f.jornada === `Jornada ${selectedJornada}`)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const jornadaPast     = jornadaFixtures.filter((f) => f.status.state === 'post');
  const jornadaLive     = jornadaFixtures.filter((f) => f.status.state === 'in');
  const jornadaUpcoming = jornadaFixtures.filter((f) => f.status.state === 'pre');

  const upcomingFixtures = fixtures.filter((f) => f.status.state === 'pre')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 10);
  const pastFixtures = fixtures.filter((f) => f.status.state === 'post')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const entries = table?.entries ?? [];
  const isEmpty = entries.length === 0;

  return (
    <div className="min-h-screen bg-[#f0f6f6] dark:bg-bg-1 font-display text-gray-900 dark:text-white">

      {/* Season header */}
      <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12] px-4 py-6 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% -20%, #1a7a78 0%, transparent 70%)' }} />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-brand-teal/70 mb-1">Liga MX</p>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{table?.season ?? 'Apertura 2026'}</h1>
              <p className="text-xs text-white/30 mt-1">
                Actualizado: {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: userTz })}
              </p>
            </div>
            <button
              onClick={() => refresh(false)} disabled={refreshing}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-white/40 transition hover:text-white/70 disabled:opacity-40"
            >
              <RefreshIcon spinning={refreshing} />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {/* Live now strip */}
          {liveFixtures.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {liveFixtures.map((f) => (
                <Link key={f.id} href={`/partido/liga-mx/${f.id}`}
                  className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500/20">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <TeamBadge abbr={f.home.abbreviation} /> {f.home.abbreviation}
                  <span className="font-bold tabular-nums text-red-400">{f.home.score ?? 0}–{f.away.score ?? 0}</span>
                  {f.away.abbreviation} <TeamBadge abbr={f.away.abbreviation} />
                  <span className="text-[10px] text-red-400/70">{f.status.shortDetail}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab selector */}
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-0 sm:px-6">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/[0.05] p-1 w-fit">
          {(['tabla', 'jornada', 'liguilla'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={['rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition-all',
                tab === t ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'].join(' ')}>
              {t === 'tabla' ? 'Tabla' : t === 'jornada' ? 'Calendario' : 'Liguilla'}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6">

        {/* ── TABLA ── */}
        {tab === 'tabla' && (
          <>
            {isEmpty ? (
              <OffSeason />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2.5rem_2.5rem_2.5rem_3rem] gap-x-1 border-b border-gray-100 dark:border-white/[0.04] px-4 sm:px-5 py-2 text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">
                  <span className="text-center">#</span>
                  <span>Equipo</span>
                  <span className="text-center">PJ</span>
                  <span className="text-center">G</span>
                  <span className="text-center">E</span>
                  <span className="text-center">P</span>
                  <span className="hidden text-center sm:block">GF</span>
                  <span className="text-center">DG</span>
                  <span className="text-center">Pts</span>
                </div>

                {entries.map((entry, idx) => <StandingsRow key={entry.team.id} entry={entry} idx={idx} total={entries.length} />)}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 border-t border-gray-100 dark:border-white/[0.04] px-5 py-3">
                  <LegendDot color="orange" label="Liguilla (1–8)" />
                  <LegendDot color="teal"   label="Repechaje (9–12)" />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── CALENDARIO ── */}
        {tab === 'jornada' && (
          <div className="space-y-5">
            {/* Jornada scroller */}
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-1.5 min-w-max">
                {allJornadas.map((j) => {
                  const jFixtures = fixtures.filter((f) => f.jornada === `Jornada ${j}`);
                  const hasLive   = jFixtures.some((f) => f.status.state === 'in');
                  const hasPast   = jFixtures.some((f) => f.status.state === 'post');
                  const isActive  = j === selectedJornada;
                  return (
                    <button key={j} onClick={() => setSelectedJornada(j)}
                      className={['relative rounded-xl px-3 py-2 text-xs font-bold transition-all',
                        isActive ? 'bg-brand-orange text-white shadow-lg'
                          : hasLive ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                          : hasPast ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'
                          : 'text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06]'].join(' ')}>
                      {isActive && <span className="absolute inset-0 rounded-xl opacity-30 blur-md" style={{ background: '#f07820' }} />}
                      <span className="relative">J{j}</span>
                      {hasLive && !isActive && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jornada header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Jornada {selectedJornada}</h3>
              {jornadaFixtures[0]?.date && (
                <span className="text-xs text-gray-400 dark:text-white/30">
                  {fmtDate(jornadaFixtures[0].date, userTz)} – {jornadaFixtures[jornadaFixtures.length - 1]?.date ? fmtDate(jornadaFixtures[jornadaFixtures.length - 1].date, userTz) : ''}
                </span>
              )}
            </div>

            {/* Live games */}
            {jornadaLive.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">En vivo</span>
                </div>
                {jornadaLive.map((f) => <FixtureCard key={f.id} fixture={f} tz={userTz} />)}
              </div>
            )}

            {/* Today's games */}
            {todayFixtures.filter((f) => f.jornada === `Jornada ${selectedJornada}`).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">Hoy</p>
                {todayFixtures.filter((f) => f.jornada === `Jornada ${selectedJornada}`).map((f) => <FixtureCard key={f.id} fixture={f} tz={userTz} />)}
              </div>
            )}

            {/* Upcoming */}
            {jornadaUpcoming.length > 0 && (
              <div className="space-y-2">
                {jornadaUpcoming.length > 0 && <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">Próximos</p>}
                {jornadaUpcoming.map((f) => <FixtureCard key={f.id} fixture={f} tz={userTz} />)}
              </div>
            )}

            {/* Results */}
            {jornadaPast.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-white/40">Resultados</p>
                {jornadaPast.map((f) => <FixtureCard key={f.id} fixture={f} tz={userTz} />)}
              </div>
            )}

            {jornadaFixtures.length === 0 && <EmptyState text={`No hay partidos registrados para Jornada ${selectedJornada}`} />}
          </div>
        )}

        {/* ── LIGUILLA TRACKER ── */}
        {tab === 'liguilla' && (
          <LliguillaTracker entries={entries} />
        )}
      </div>
    </div>
  );
}

// ── Standings row ─────────────────────────────────────────────────────────────
function StandingsRow({ entry, idx, total }: { entry: LigaMXEntry; idx: number; total: number }) {
  const inLiguilla  = entry.position <= LIGUILLA_SPOTS;
  const inRepechaje = !inLiguilla && entry.position <= LIGUILLA_SPOTS + REPECHAJE_SPOTS;
  const isFirst     = entry.position === 1;

  return (
    <div className={[
      'grid grid-cols-[2rem_1fr_2rem_2rem_2rem_2.5rem_2.5rem_2.5rem_3rem] gap-x-1 px-4 sm:px-5 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]',
      idx < total - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : '',
      entry.position === LIGUILLA_SPOTS + 1 ? 'border-t-2 border-brand-teal/30' : '',
      entry.position === LIGUILLA_SPOTS + REPECHAJE_SPOTS + 1 ? 'border-t-2 border-gray-300 dark:border-white/10' : '',
    ].join(' ')}>
      <div className="flex items-center justify-center">
        <span className={['flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
          isFirst ? 'bg-brand-orange/20 text-brand-orange'
            : inLiguilla ? 'bg-brand-teal/20 text-brand-teal'
            : inRepechaje ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
            : 'text-gray-400 dark:text-white/30'].join(' ')}>
          {entry.position}
        </span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <TeamBadge abbr={entry.team.abbreviation} />
        <span className="truncate text-xs sm:text-sm font-semibold text-gray-800 dark:text-white/85">
          {teamNameEs(entry.team.name)}
        </span>
      </div>
      <span className="flex items-center justify-center text-xs text-gray-500 dark:text-white/50">{entry.gp}</span>
      <span className="flex items-center justify-center text-xs text-gray-500 dark:text-white/50">{entry.w}</span>
      <span className="flex items-center justify-center text-xs text-gray-500 dark:text-white/50">{entry.d}</span>
      <span className="flex items-center justify-center text-xs text-gray-500 dark:text-white/50">{entry.l}</span>
      <span className="hidden items-center justify-center text-xs text-gray-500 dark:text-white/50 sm:flex">{entry.gf}</span>
      <span className={['flex items-center justify-center text-xs font-medium',
        entry.gd.startsWith('+') ? 'text-emerald-500' : entry.gd.startsWith('-') ? 'text-red-500' : 'text-gray-500 dark:text-white/50'].join(' ')}>
        {entry.gd}
      </span>
      <div className="flex items-center justify-center">
        <span className={['flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
          isFirst ? 'bg-brand-orange text-white shadow-[0_0_12px_rgba(240,120,32,0.4)]'
            : inLiguilla ? 'bg-brand-teal/20 text-brand-teal'
            : inRepechaje ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
            : entry.pts > 0 ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70'
            : 'text-gray-300 dark:text-white/25'].join(' ')}>
          {entry.pts}
        </span>
      </div>
    </div>
  );
}

// ── Liguilla tracker ──────────────────────────────────────────────────────────
function LliguillaTracker({ entries }: { entries: LigaMXEntry[] }) {
  if (entries.length === 0) return <OffSeason />;
  const maxPts = Math.max(...entries.map((e) => e.pts), 1);

  return (
    <div className="space-y-6">
      {/* Zone headers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ZoneStat label="Liguilla" count={entries.filter((e) => e.position <= LIGUILLA_SPOTS).length} total={LIGUILLA_SPOTS} color="teal" />
        <ZoneStat label="Repechaje" count={entries.filter((e) => e.position > LIGUILLA_SPOTS && e.position <= LIGUILLA_SPOTS + REPECHAJE_SPOTS).length} total={REPECHAJE_SPOTS} color="yellow" />
        <ZoneStat label="Eliminados" count={entries.filter((e) => e.position > LIGUILLA_SPOTS + REPECHAJE_SPOTS).length} total={entries.length - LIGUILLA_SPOTS - REPECHAJE_SPOTS} color="gray" />
      </div>

      {/* Progress bars */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
        {entries.map((entry, idx) => {
          const inL  = entry.position <= LIGUILLA_SPOTS;
          const inR  = !inL && entry.position <= LIGUILLA_SPOTS + REPECHAJE_SPOTS;
          const pct  = maxPts > 0 ? (entry.pts / maxPts) * 100 : 0;
          return (
            <div key={entry.team.id}
              className={['px-5 py-3', idx < entries.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''].join(' ')}>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="w-4 text-xs text-gray-400 dark:text-white/30 text-right shrink-0">{entry.position}</span>
                <TeamBadge abbr={entry.team.abbreviation} />
                <span className="text-sm font-semibold min-w-0 truncate">{teamNameEs(entry.team.name)}</span>
                <span className="ml-auto text-sm font-bold shrink-0">{entry.pts} pts</span>
                {inL && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-brand-teal/15 text-brand-teal">Liguilla</span>}
                {inR && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-yellow-500/15 text-yellow-700 dark:text-yellow-400">Repechaje</span>}
              </div>
              <div className="ml-7 h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                <div className={['h-full rounded-full transition-all duration-500',
                  inL ? 'bg-brand-teal' : inR ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-white/20'].join(' ')}
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-white/25 text-center">
        Top {LIGUILLA_SPOTS} avanzan directo a Liguilla · Posiciones {LIGUILLA_SPOTS + 1}–{LIGUILLA_SPOTS + REPECHAJE_SPOTS} juegan Repechaje
      </p>
    </div>
  );
}

function ZoneStat({ label, count, total, color }: { label: string; count: number; total: number; color: 'teal' | 'yellow' | 'gray' }) {
  const cls = color === 'teal' ? 'bg-brand-teal/10 text-brand-teal border-brand-teal/20'
    : color === 'yellow' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
    : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/10';
  return (
    <div className={`rounded-xl border px-4 py-3 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{count}<span className="text-sm font-normal opacity-50">/{total}</span></p>
    </div>
  );
}

function FixtureCard({ fixture: f, tz }: { fixture: LigaMXFixture; tz: string }) {
  const isDone = f.status.state === 'post';
  const isLive = f.status.state === 'in';
  const homeWin = isDone && Number(f.home.score) > Number(f.away.score);
  const awayWin = isDone && Number(f.away.score) > Number(f.home.score);
  return (
    <Link href={`/partido/liga-mx/${f.id}`}
      className={['group block rounded-xl border px-4 py-3 transition',
        isLive ? 'border-red-400/30 bg-red-50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10'
          : 'border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/[0.1] hover:bg-white dark:hover:bg-white/[0.04]'].join(' ')}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-white/30">{f.jornada ?? fmtDate(f.date, tz)}</span>
        {isLive
          ? <span className="flex items-center gap-1 text-[10px] font-bold text-red-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />{f.status.shortDetail}</span>
          : isDone ? <span className="rounded bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:text-white/40">FT</span>
          : <span className="rounded bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-teal">{fmtTime(f.date, tz)}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <TeamBadge abbr={f.home.abbreviation} />
          <span className={['truncate text-sm font-semibold', homeWin ? 'text-gray-900 dark:text-white' : isDone ? 'text-gray-400 dark:text-white/50' : 'text-gray-600 dark:text-white/70'].join(' ')}>
            {teamNameEs(f.home.name)}
          </span>
        </div>
        {(isDone || isLive)
          ? <span className="shrink-0 text-lg font-bold tracking-wider text-brand-orange tabular-nums">{f.home.score}–{f.away.score}</span>
          : <span className="shrink-0 text-sm font-bold text-gray-300 dark:text-white/20">vs</span>}
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-1.5">
          <TeamBadge abbr={f.away.abbreviation} />
          <span className={['truncate text-right text-sm font-semibold', awayWin ? 'text-gray-900 dark:text-white' : isDone ? 'text-gray-400 dark:text-white/50' : 'text-gray-600 dark:text-white/70'].join(' ')}>
            {teamNameEs(f.away.name)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function OffSeason() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] py-16 text-center px-6">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">Apertura 2026</p>
      <p className="mt-2 text-sm text-gray-400 dark:text-white/40">La temporada comienza en julio. Regresa pronto para ver la tabla de posiciones en vivo.</p>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-gray-200 dark:border-white/[0.06] pb-2">
      <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-gray-500 dark:text-white/50">{label}</h3>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] p-6 text-center text-xs text-gray-400 dark:text-white/25">{text}</div>;
}
function LegendDot({ color, label }: { color: 'orange' | 'teal' | 'yellow'; label: string }) {
  const cls = color === 'orange' ? 'bg-brand-orange' : color === 'teal' ? 'bg-brand-teal' : 'bg-yellow-500';
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      <span className="text-[10px] text-gray-400 dark:text-white/30">{label}</span>
    </div>
  );
}
function RefreshIcon({ spinning }: { spinning: boolean }) {
  return <svg className={['h-3.5 w-3.5', spinning ? 'animate-spin' : ''].join(' ')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
