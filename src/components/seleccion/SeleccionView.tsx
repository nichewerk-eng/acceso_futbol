'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import type { Fixture } from '@/components/standings/types';

// ── Historical WC data — El Quinto Partido narrative ─────────────────────────
const CURSE_YEARS = [
  { year: 1994, rival: 'Bulgaria',       score: '1–1 pen',  note: 'Inicio de la maldición' },
  { year: 1998, rival: 'Alemania',       score: '1–2',      note: '' },
  { year: 2002, rival: 'Estados Unidos', score: '0–2',      note: '' },
  { year: 2006, rival: 'Argentina',      score: '1–2 AET',  note: '' },
  { year: 2010, rival: 'Argentina',      score: '1–3',      note: '' },
  { year: 2014, rival: 'Argentina',      score: '1–2',      note: '' },
  { year: 2018, rival: 'Brasil',         score: '0–2',      note: 'Última eliminación' },
];

const FLAG: Record<string, string> = {
  MEX: '🇲🇽', ECU: '🇪🇨', USA: '🇺🇸', CAN: '🇨🇦', KSA: '🇸🇦', CPV: '🇨🇻',
  URU: '🇺🇾', ESP: '🇪🇸', ARG: '🇦🇷', BRA: '🇧🇷', GER: '🇩🇪', NED: '🇳🇱',
  FRA: '🇫🇷', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', POR: '🇵🇹', COL: '🇨🇴',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

function useCountdown(targetDate: string | null, tz: string) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetDate]);
  void tz;
  const s = Math.floor(diff / 1000);
  const days  = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins  = Math.floor((s % 3600) / 60);
  const secs  = s % 60;
  return { days, hours, mins, secs, total: diff };
}

function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Props { fixtures: Fixture[] }

export default function SeleccionView({ fixtures }: Props) {
  const [userTz, setUserTz] = useState('America/Mexico_City');
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  // Filter Mexico fixtures
  const mexFixtures = fixtures.filter((f) =>
    f.home.abbreviation === 'MEX' || f.away.abbreviation === 'MEX'
  );
  const liveGame     = mexFixtures.find((f) => f.status.state === 'in');
  const nextGame     = mexFixtures.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const pastGames    = mexFixtures.filter((f) => f.status.state === 'post').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const countdown = useCountdown(nextGame?.date ?? null, userTz);

  const is2026Live    = !!liveGame;
  const is2026Active  = is2026Live || !!nextGame;

  return (
    <div className="min-h-screen bg-[#f0f6f6] dark:bg-bg-1 font-display text-gray-900 dark:text-white">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12] px-4 pb-8 pt-6 sm:pb-12">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 80% at 50% -10%, rgba(26,122,120,0.35) 0%, transparent 65%)' }} />
        <div className="relative mx-auto max-w-5xl">

          {/* Eyebrow */}
          <p className="text-center text-[10px] font-bold tracking-[0.25em] uppercase text-white/30 mb-4">FIFA World Cup 2026</p>

          {/* Live banner */}
          {liveGame && (
            <div className="mb-5 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm font-bold text-white">
                  {flag(liveGame.home.abbreviation)} {liveGame.home.score} – {liveGame.away.score} {flag(liveGame.away.abbreviation)}
                </span>
                <span className="text-xs text-red-400">{liveGame.status.shortDetail}</span>
              </div>
            </div>
          )}

          {/* Next match + countdown — two-column on desktop */}
          {!liveGame && nextGame && (() => {
            const mexHome  = nextGame.home.abbreviation === 'MEX';
            const rival    = mexHome ? nextGame.away : nextGame.home;
            return (
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between sm:gap-0">

                {/* Teams */}
                <div className="flex flex-1 items-center justify-center gap-5 sm:justify-start">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-5xl leading-none">🇲🇽</span>
                    <span className="text-xs font-bold text-white/60">México</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Próximo partido</span>
                    <span className="block text-lg font-bold text-white/60">vs</span>
                    <span className="block text-[11px] text-white/30 mt-1">
                      {new Date(nextGame.date).toLocaleDateString('es-MX', { timeZone: userTz, weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                    <span className="block text-sm font-bold text-white">{fmtTime(nextGame.date, userTz)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-5xl leading-none">{flag(rival.abbreviation)}</span>
                    <span className="text-xs font-bold text-white/60">{teamNameEs(rival.name)}</span>
                  </div>
                </div>

                {/* Countdown */}
                {countdown.total > 0 && (
                  <div className="flex items-end gap-3 sm:gap-4">
                    {([['Días', countdown.days], ['Horas', countdown.hours], ['Min', countdown.mins], ['Seg', countdown.secs]] as const).map(([label, val], i) => (
                      <div key={label} className="flex items-end gap-3">
                        {i > 0 && <span className="mb-1 text-xl font-bold text-white/20 leading-none">:</span>}
                        <div className="flex flex-col items-center">
                          <span className="block text-4xl font-bold tabular-nums text-white sm:text-5xl leading-none">
                            {String(val).padStart(2, '0')}
                          </span>
                          <span className="text-[9px] uppercase tracking-widest text-white/30 mt-1">{label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Results inline — compact pills below hero */}
          {pastGames.length > 0 && (
            <div className="mt-6 overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 min-w-max">
                {pastGames.slice(0, 5).map((f) => {
                  const mexHome  = f.home.abbreviation === 'MEX';
                  const mexScore = mexHome ? Number(f.home.score) : Number(f.away.score);
                  const rivScore = mexHome ? Number(f.away.score) : Number(f.home.score);
                  const rivAbbr  = mexHome ? f.away.abbreviation : f.home.abbreviation;
                  const won      = mexScore > rivScore;
                  const drew     = mexScore === rivScore;
                  return (
                    <Link key={f.id} href={`/partido/mundial/${f.id}`}
                      className={['flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80',
                        won  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                             : drew ? 'border-white/10 bg-white/5 text-white/50'
                             : 'border-red-500/30 bg-red-500/10 text-red-400'].join(' ')}>
                      <span className="font-bold">{won ? 'G' : drew ? 'E' : 'P'}</span>
                      🇲🇽 {mexScore}–{rivScore} {flag(rivAbbr)}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 pb-16 sm:px-6 space-y-10">

        {/* ── El Quinto Partido ── */}
        <section>
          {/* Section header */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">El Quinto Partido</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-white/40 max-w-lg mx-auto">
              Desde 1994 hasta 2018, México llegó a los dieciseisavos — y fue eliminado <strong className="text-gray-700 dark:text-white/70">7 veces seguidas</strong>. En 2026, juegan en casa.
            </p>
          </div>

          {/* Streak counter — prominent */}
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 px-4 py-4">
              <p className="text-4xl font-bold text-red-500 tabular-nums">7</p>
              <p className="text-[10px] uppercase tracking-wider text-red-400/70 mt-1">Eliminaciones<br/>dieciseisavos</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-4">
              <p className="text-4xl font-bold text-gray-400 dark:text-white/30 tabular-nums">2</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-white/20 mt-1">Cuartos<br/>de final</p>
            </div>
            <div className={['rounded-2xl border px-4 py-4',
              is2026Active ? 'border-brand-orange/30 bg-brand-orange/5' : 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]'].join(' ')}>
              <p className={['text-4xl font-bold tabular-nums', is2026Active ? 'text-brand-orange' : 'text-gray-300 dark:text-white/20'].join(' ')}>26</p>
              <p className={['text-[10px] uppercase tracking-wider mt-1', is2026Active ? 'text-brand-orange/60' : 'text-gray-300/70 dark:text-white/20'].join(' ')}>
                {is2026Live ? 'En curso' : is2026Active ? 'En casa' : '?'}</p>
            </div>
          </div>

          {/* Curse timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[28px] top-0 bottom-0 w-px bg-red-200/50 dark:bg-red-500/10" />

            <div className="space-y-2">
              {CURSE_YEARS.map((c, i) => (
                <div key={c.year} className="relative flex items-center gap-4">
                  {/* Node */}
                  <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5">
                    <span className="text-[10px] font-bold text-red-500/60">{c.year}</span>
                    <span className="text-base font-bold text-red-500">✕</span>
                  </div>
                  {/* Card */}
                  <div className={['flex-1 rounded-xl border px-4 py-3',
                    i === CURSE_YEARS.length - 1
                      ? 'border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/[0.07]'
                      : 'border-gray-100 dark:border-white/[0.04] bg-white dark:bg-white/[0.02]'].join(' ')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          vs {c.rival}
                        </p>
                        {c.note && <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">{c.note}</p>}
                      </div>
                      <span className={['text-base font-bold tabular-nums',
                        i === CURSE_YEARS.length - 1 ? 'text-red-500' : 'text-red-400 dark:text-red-500/70'].join(' ')}>
                        {c.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 2022 — out in groups */}
              <div className="relative flex items-center gap-4">
                <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/30">2022</span>
                  <span className="text-base font-bold text-gray-400 dark:text-white/30">✕</span>
                </div>
                <div className="flex-1 rounded-xl border border-gray-100 dark:border-white/[0.04] bg-white dark:bg-white/[0.02] px-4 py-3">
                  <p className="text-sm font-semibold text-gray-500 dark:text-white/40">Eliminación en Grupos</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/20 mt-0.5">Sin clasificar por diferencia de goles</p>
                </div>
              </div>

              {/* 2026 — the moment */}
              <div className="relative flex items-center gap-4">
                <div className={['relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border',
                  is2026Live ? 'border-red-500/50 bg-red-500/10 animate-pulse'
                    : 'border-brand-orange/40 bg-brand-orange/5'].join(' ')}>
                  <span className="text-[10px] font-bold text-brand-orange">2026</span>
                  <span className="text-base">{is2026Live ? '⚽' : '⏳'}</span>
                </div>
                <div className="flex-1 rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-brand-orange">
                        {is2026Live && liveGame
                          ? `En vivo · ${liveGame.home.score}–${liveGame.away.score}`
                          : nextGame ? 'vs Ecuador · Programado'
                          : 'Dieciseisavos (R32)'}
                      </p>
                      <p className="text-[10px] text-brand-orange/50 mt-0.5">Casa — 80,000 aficionados</p>
                    </div>
                    <span className="text-brand-orange text-lg font-bold">?</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical context */}
          <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-white/30 mb-3">Contexto histórico</p>
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {[
                { year: '1970', stage: 'Cuartos', note: 'Anfitrión · 1–4 vs Italia', color: 'emerald' },
                { year: '1986', stage: 'Cuartos', note: 'Anfitrión · penales vs RFA', color: 'emerald' },
                { year: '1994–2018', stage: 'R16', note: '7 eliminaciones consecutivas', color: 'red' },
                { year: '2026', stage: '?', note: 'Anfitrión — oportunidad histórica', color: 'orange' },
              ].map((item) => (
                <div key={item.year} className={[
                  'rounded-xl px-3 py-3 text-center',
                  item.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20'
                    : item.color === 'red' ? 'bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20'
                    : 'bg-brand-orange/5 border border-brand-orange/20'].join(' ')}>
                  <p className={['text-sm font-bold',
                    item.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
                      : item.color === 'red' ? 'text-red-500'
                      : 'text-brand-orange'].join(' ')}>{item.year}</p>
                  <p className={['text-xs font-semibold mt-0.5',
                    item.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-300'
                      : item.color === 'red' ? 'text-red-600 dark:text-red-400'
                      : 'text-brand-orange'].join(' ')}>{item.stage}</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1 leading-tight">{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Full results ── */}
        {pastGames.length > 0 && (
          <section>
            <h2 className="text-base font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Todos los resultados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pastGames.map((f) => {
                const mexHome  = f.home.abbreviation === 'MEX';
                const mexScore = mexHome ? Number(f.home.score) : Number(f.away.score);
                const rivScore = mexHome ? Number(f.away.score) : Number(f.home.score);
                const rivAbbr  = mexHome ? f.away.abbreviation : f.home.abbreviation;
                const rivName  = mexHome ? f.away.name : f.home.name;
                const won      = mexScore > rivScore;
                const drew     = mexScore === rivScore;
                return (
                  <Link key={f.id} href={`/partido/mundial/${f.id}`}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] px-5 py-4 transition hover:border-gray-300 dark:hover:border-white/[0.1]">
                    <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      won  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                           : drew ? 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50'
                           : 'bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400'].join(' ')}>
                      {won ? 'G' : drew ? 'E' : 'P'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        🇲🇽 México vs {flag(rivAbbr)} {teamNameEs(rivName)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-white/30">{fmtDate(f.date, userTz)}</p>
                    </div>
                    <span className={['text-lg font-bold tabular-nums', won ? 'text-emerald-500' : drew ? 'text-gray-400 dark:text-white/40' : 'text-red-500'].join(' ')}>
                      {mexScore}–{rivScore}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
