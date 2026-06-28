'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import type { Fixture } from '@/components/standings/types';

// ── Historical WC data — El Quinto Partido narrative ─────────────────────────
const WC_HISTORY = [
  { year: 1930, stage: 'Grupos', result: 'Eliminado', detail: 'Primera participación' },
  { year: 1950, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1954, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1958, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1962, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1966, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1970, stage: 'Cuartos de final', result: 'Eliminado', detail: '1-4 vs Italia (siendo anfitrión)' },
  { year: 1978, stage: 'Grupos', result: 'Eliminado', detail: '' },
  { year: 1986, stage: 'Cuartos de final', result: 'Eliminado', detail: '0-0 pen vs Alemania Occidental (anfitrión)' },
  { year: 1994, stage: 'Dieciseisavos', result: 'Maldición', detail: '1-1 pen vs Bulgaria — inicio El Quinto Partido' },
  { year: 1998, stage: 'Dieciseisavos', result: 'Maldición', detail: '1-2 vs Alemania' },
  { year: 2002, stage: 'Dieciseisavos', result: 'Maldición', detail: '0-2 vs Estados Unidos' },
  { year: 2006, stage: 'Dieciseisavos', result: 'Maldición', detail: '1-2 AET vs Argentina' },
  { year: 2010, stage: 'Dieciseisavos', result: 'Maldición', detail: '1-3 vs Argentina' },
  { year: 2014, stage: 'Dieciseisavos', result: 'Maldición', detail: '1-2 vs Argentina' },
  { year: 2018, stage: 'Dieciseisavos', result: 'Maldición', detail: '0-2 vs Brasil' },
  { year: 2022, stage: 'Grupos', result: 'Eliminado', detail: 'Sin clasificar por diferencia de goles' },
  { year: 2026, stage: 'Dieciseisavos (R32)', result: '?', detail: 'vs Ecuador · En curso' },
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

  return (
    <div className="min-h-screen bg-[#f0f6f6] dark:bg-bg-1 font-display text-gray-900 dark:text-white">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12] px-4 py-8 sm:py-12">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% -20%, #1a7a78 0%, transparent 70%)' }} />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="text-4xl mb-2">🇲🇽</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Selección Mexicana</h1>
          <p className="mt-1 text-sm text-white/40">FIFA World Cup 2026</p>

          {liveGame && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-4">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-sm font-bold text-white">
                {flag(liveGame.home.abbreviation)} {liveGame.home.score} – {liveGame.away.score} {flag(liveGame.away.abbreviation)}
              </span>
              <span className="text-xs text-red-400">{liveGame.status.shortDetail}</span>
            </div>
          )}

          {!liveGame && nextGame && (
            <div className="mt-6">
              <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Próximo partido</p>
              <div className="inline-flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-4">
                <span className="text-xl">{flag(nextGame.home.abbreviation)}</span>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">
                    {teamNameEs(nextGame.home.name)} vs {teamNameEs(nextGame.away.name)}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{fmtDate(nextGame.date, userTz)} · {fmtTime(nextGame.date, userTz)}</p>
                </div>
                <span className="text-xl">{flag(nextGame.away.abbreviation)}</span>
              </div>

              {/* Countdown */}
              {countdown.total > 0 && (
                <div className="mt-5 flex justify-center gap-4">
                  {[['Días', countdown.days], ['Horas', countdown.hours], ['Min', countdown.mins], ['Seg', countdown.secs]].map(([label, val]) => (
                    <div key={String(label)} className="text-center">
                      <span className="block text-3xl font-bold text-white tabular-nums sm:text-4xl">{String(val).padStart(2, '0')}</span>
                      <span className="text-[10px] text-white/30 uppercase tracking-widest">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 pb-16 sm:px-6 space-y-10">

        {/* ── Results ── */}
        {pastGames.length > 0 && (
          <section>
            <h2 className="text-base font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-4">Resultados</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {pastGames.map((f) => {
                const mexHome = f.home.abbreviation === 'MEX';
                const mexScore = mexHome ? Number(f.home.score) : Number(f.away.score);
                const rivScore = mexHome ? Number(f.away.score) : Number(f.home.score);
                const rivAbbr  = mexHome ? f.away.abbreviation : f.home.abbreviation;
                const rivName  = mexHome ? f.away.name : f.home.name;
                const won = mexScore > rivScore; const drew = mexScore === rivScore;
                return (
                  <Link key={f.id} href={`/partido/mundial/${f.id}`}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] px-5 py-4 transition hover:border-gray-300 dark:hover:border-white/[0.1]">
                    <span className={['flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      won ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
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

        {/* ── El Quinto Partido tracker ── */}
        <section>
          <h2 className="text-base font-bold tracking-wider uppercase text-gray-500 dark:text-white/50 mb-2">El Quinto Partido</h2>
          <p className="text-xs text-gray-400 dark:text-white/30 mb-5">
            La maldición: desde 1994 hasta 2018, México fue eliminado en los dieciseisavos (7 veces consecutivas). El &ldquo;Quinto Partido&rdquo; es el paso a cuartos de final que esta generación puede lograr en 2026.
          </p>

          <div className="space-y-1.5">
            {WC_HISTORY.filter((h) => h.year >= 1994).map((h) => {
              const isCurse   = h.result === 'Maldición';
              const isCurrent = h.year === 2026;
              const isEarly   = h.result === 'Eliminado' && h.year >= 1994 && h.year < 2026;
              return (
                <div key={h.year} className={[
                  'flex items-center gap-3 rounded-xl px-4 py-2.5',
                  isCurrent ? 'bg-brand-orange/10 border border-brand-orange/30'
                    : isCurse ? 'bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20'
                    : isEarly ? 'bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]'
                    : 'bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20',
                ].join(' ')}>
                  <span className={['shrink-0 text-xs font-bold w-10 text-right',
                    isCurrent ? 'text-brand-orange' : isCurse ? 'text-red-500' : isEarly ? 'text-gray-400 dark:text-white/30' : 'text-emerald-500'].join(' ')}>
                    {h.year}
                  </span>
                  <span className={['text-xs font-semibold',
                    isCurrent ? 'text-brand-orange' : isCurse ? 'text-red-600 dark:text-red-400' : isEarly ? 'text-gray-500 dark:text-white/50' : 'text-emerald-600 dark:text-emerald-400'].join(' ')}>
                    {h.stage}
                  </span>
                  {h.detail && <span className="text-xs text-gray-400 dark:text-white/30 truncate">{h.detail}</span>}
                  <span className="ml-auto shrink-0 text-[11px] font-bold">
                    {isCurrent ? '⏳' : isCurse ? '✗' : isEarly ? '✗' : '✓'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Streak counter */}
          <div className="mt-5 flex gap-3">
            <div className="rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 px-5 py-3 text-center flex-1">
              <p className="text-2xl font-bold text-red-500">7</p>
              <p className="text-[10px] text-red-400/70 uppercase tracking-wider">Eliminaciones seguidas (R16)</p>
            </div>
            <div className="rounded-xl bg-brand-orange/5 border border-brand-orange/20 px-5 py-3 text-center flex-1">
              <p className="text-2xl font-bold text-brand-orange">2026</p>
              <p className="text-[10px] text-brand-orange/60 uppercase tracking-wider">Para romper la maldición</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
