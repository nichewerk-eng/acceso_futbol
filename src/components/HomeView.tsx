'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import type { Fixture } from '@/components/standings/types';

const FLAG: Record<string, string> = {
  MEX: '🇲🇽', ECU: '🇪🇨', USA: '🇺🇸', CAN: '🇨🇦', KOR: '🇰🇷',
  CZE: '🇨🇿', RSA: '🇿🇦', GER: '🇩🇪', ARG: '🇦🇷', FRA: '🇫🇷',
  BRA: '🇧🇷', ESP: '🇪🇸', POR: '🇵🇹', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', URU: '🇺🇾',
  COL: '🇨🇴', NED: '🇳🇱', BEL: '🇧🇪', JPN: '🇯🇵', SEN: '🇸🇳',
  MAR: '🇲🇦', CPV: '🇨🇻', KSA: '🇸🇦', NOR: '🇳🇴', CRO: '🇭🇷',
  GHA: '🇬🇭', PAN: '🇵🇦', QAT: '🇶🇦', IRN: '🇮🇷', EGY: '🇪🇬',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
}

function useCountdown(targetDate: string | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!targetDate) return;
    const tick = () => setDiff(Math.max(0, new Date(targetDate).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [targetDate]);
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60, total: diff };
}

interface Props { fixtures: Fixture[] }

export default function HomeView({ fixtures }: Props) {
  const [userTz, setUserTz] = useState('America/Mexico_City');
  useEffect(() => { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz) setUserTz(tz); }, []);

  const mexFixtures = fixtures.filter((f) => f.home.abbreviation === 'MEX' || f.away.abbreviation === 'MEX');
  const mexLive     = mexFixtures.find((f) => f.status.state === 'in');
  const mexNext     = mexFixtures.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const pastGames   = mexFixtures.filter((f) => f.status.state === 'post').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const countdown   = useCountdown(mexNext?.date ?? null);

  const game    = mexLive ?? mexNext;
  const mexHome = game ? game.home.abbreviation === 'MEX' : true;
  const rival   = game ? (mexHome ? game.away : game.home) : null;

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-[#080d12] font-display">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(26,122,120,0.25) 0%, transparent 60%)' }} />

      <div className="relative flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4 py-16 text-center sm:py-24">

        {/* Eyebrow */}
        <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/30 mb-8">FIFA World Cup 2026</p>

        {/* Live banner */}
        {mexLive && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-5 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-bold text-red-400">En vivo · {mexLive.status.shortDetail}</span>
          </div>
        )}

        {/* Flags */}
        {game && rival ? (
          <div className="flex items-center justify-center gap-8 sm:gap-16 mb-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-7xl leading-none sm:text-8xl">🇲🇽</span>
              <span className="text-sm font-bold text-white/60">México</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              {mexLive ? (
                <p className="text-5xl font-bold tabular-nums text-white sm:text-6xl">
                  {game.home.score}<span className="mx-2 text-white/25">–</span>{game.away.score}
                </p>
              ) : (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/25 mb-1">Próximo partido</p>
                  <p className="text-2xl font-bold text-white/30">vs</p>
                  <p className="text-xs text-white/30 mt-2">
                    {new Date(game.date).toLocaleDateString('es-MX', { timeZone: userTz, weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-base font-bold text-white mt-0.5">{fmtTime(game.date, userTz)}</p>
                </>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-7xl leading-none sm:text-8xl">{flag(rival.abbreviation)}</span>
              <span className="text-sm font-bold text-white/60">{teamNameEs(rival.name)}</span>
            </div>
          </div>
        ) : (
          <p className="text-4xl mb-6">🇲🇽</p>
        )}

        {/* Countdown */}
        {!mexLive && countdown.total > 0 && (
          <div className="flex items-end justify-center gap-3 sm:gap-5 mb-8">
            {([['Días', countdown.days], ['Horas', countdown.hours], ['Min', countdown.mins], ['Seg', countdown.secs]] as const).map(([label, val], i) => (
              <div key={label} className="flex items-end gap-3 sm:gap-5">
                {i > 0 && <span className="mb-3 text-2xl font-bold text-white/15 leading-none">:</span>}
                <div className="flex flex-col items-center">
                  <span className="block text-5xl font-bold tabular-nums text-white sm:text-7xl leading-none">
                    {String(val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] uppercase tracking-widest text-white/25 mt-2">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past results pills */}
        {pastGames.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {pastGames.slice(0, 5).map((f) => {
              const mH  = f.home.abbreviation === 'MEX';
              const mS  = mH ? Number(f.home.score) : Number(f.away.score);
              const rS  = mH ? Number(f.away.score) : Number(f.home.score);
              const rAb = mH ? f.away.abbreviation : f.home.abbreviation;
              const won = mS > rS; const drew = mS === rS;
              return (
                <span key={f.id} className={['flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                  won  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                       : drew ? 'border-white/10 bg-white/5 text-white/40'
                       : 'border-red-500/30 bg-red-500/10 text-red-400'].join(' ')}>
                  <span className="font-bold">{won ? 'G' : drew ? 'E' : 'P'}</span>
                  🇲🇽 {mS}–{rS} {flag(rAb)}
                </span>
              );
            })}
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/tabla"
            className="rounded-xl bg-brand-orange px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(240,120,32,0.35)] transition hover:bg-brand-orange/90">
            Tabla de Grupos
          </Link>
          <Link href="/seleccion"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white">
            Selección Mexicana
          </Link>
        </div>
      </div>
    </div>
  );
}
