'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import type { MatchEvent } from '@/app/api/match/[league]/[id]/route';

// ── Flag map ──────────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  MEX: '🇲🇽', ECU: '🇪🇨', USA: '🇺🇸', CAN: '🇨🇦', KOR: '🇰🇷',
  CZE: '🇨🇿', RSA: '🇿🇦', GER: '🇩🇪', ARG: '🇦🇷', FRA: '🇫🇷',
  BRA: '🇧🇷', ESP: '🇪🇸', POR: '🇵🇹', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', URU: '🇺🇾',
  COL: '🇨🇴', NED: '🇳🇱', BEL: '🇧🇪', JPN: '🇯🇵', SEN: '🇸🇳',
  MAR: '🇲🇦', CPV: '🇨🇻', KSA: '🇸🇦', NOR: '🇳🇴', CRO: '🇭🇷',
  GHA: '🇬🇭', PAN: '🇵🇦', QAT: '🇶🇦', IRN: '🇮🇷', EGY: '🇪🇬',
  NZL: '🇳🇿', AUS: '🇦🇺', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', TUN: '🇹🇳',
  SWE: '🇸🇪', URG: '🇺🇾', ALG: '🇩🇿', AUT: '🇦🇹', JOR: '🇯🇴',
  UZB: '🇺🇿', COD: '🇨🇩', PAR: '🇵🇾', TUR: '🇹🇷', IRQ: '🇮🇶',
  CIV: '🇨🇮', CUW: '🇨🇼',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDay(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
}
function isToday(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', { timeZone: tz }) === new Date().toLocaleDateString('es-MX', { timeZone: tz });
}

// ── Fixture type (minimal) ────────────────────────────────────────────────────
interface BannerFixture {
  id: string; date: string;
  status: { state: string; shortDetail: string; completed: boolean };
  home: { name: string; abbreviation: string; score: string | null };
  away: { name: string; abbreviation: string; score: string | null };
}

// ── Goal event helpers ────────────────────────────────────────────────────────
interface GoalEvent { scorer: string; clock: string; teamAbbr: string; ownGoal: boolean }

function parseGoals(plays: MatchEvent[]): GoalEvent[] {
  return plays
    .filter((p) => /goal/i.test(p.type) || /\bscores?\b/i.test(p.text))
    .map((p) => {
      const ownGoal = /own.?goal|en.?propia/i.test(p.text);
      // Extract scorer name — text is often "J. Smith scores" or "Goal - Smith (23')"
      const nameMatch = p.text.match(/^([A-ZÁ-Ú][a-záéíóúñ]+ )?([A-ZÁ-Ú][a-záéíóúñ.-]+(?: [A-ZÁ-Ú][a-záéíóúñ.-]+)*)\s+(?:scores?|anota|gol)/i)
        ?? p.text.match(/(?:Goal|Gol)\s*[-–:]\s*(.+?)(?:\s*\(|$)/i);
      const scorer = nameMatch?.[2] ?? nameMatch?.[1] ?? p.text.split(' ').slice(0, 2).join(' ');
      // Normalize clock: "23:00" → "23'" or keep as-is if already "23'"
      const clock  = p.clock.replace(/:00$/, '').replace(/^(\d+)$/, "$1'");
      return { scorer: scorer.trim(), clock, teamAbbr: p.teamAbbr, ownGoal };
    });
}

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(target: string | null) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    if (!target) return;
    const tick = () => setDiff(Math.max(0, new Date(target).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [target]);
  const s = Math.floor(diff / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60, total: diff };
}

// ── Game card ─────────────────────────────────────────────────────────────────
function GameCard({ f, tz }: { f: BannerFixture; tz: string }) {
  const isLive = f.status.state === 'in';
  const isDone = f.status.state === 'post';
  const homeWin = isDone && Number(f.home.score) > Number(f.away.score);
  const awayWin = isDone && Number(f.away.score) > Number(f.home.score);

  return (
    <div className={['flex flex-col gap-2 rounded-xl border px-3.5 py-3 min-w-[155px]',
      isLive ? 'border-red-500/30 bg-red-500/5'
             : 'border-white/[0.07] bg-white/[0.03]'].join(' ')}>
      {/* Status */}
      <div className="flex items-center justify-between gap-1">
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            {f.status.shortDetail}
          </span>
        ) : isDone ? (
          <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/40">FT</span>
        ) : (
          <span className="rounded bg-[#1a7a78]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#1a7a78]">{fmtTime(f.date, tz)}</span>
        )}
        <span className="text-[9px] text-white/20">{new Date(f.date).toLocaleDateString('es-MX', { timeZone: tz, day: 'numeric', month: 'short' })}</span>
      </div>
      {/* Home */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none shrink-0">{flag(f.home.abbreviation)}</span>
          <span className={['truncate text-[11px] font-semibold max-w-[80px]', homeWin ? 'text-white' : isDone ? 'text-white/40' : 'text-white/75'].join(' ')}>
            {teamNameEs(f.home.name)}
          </span>
        </div>
        {(isLive || isDone) && (
          <span className={['text-sm font-bold tabular-nums', homeWin ? 'text-white' : 'text-white/40'].join(' ')}>{f.home.score ?? 0}</span>
        )}
      </div>
      {/* Away */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none shrink-0">{flag(f.away.abbreviation)}</span>
          <span className={['truncate text-[11px] font-semibold max-w-[80px]', awayWin ? 'text-white' : isDone ? 'text-white/40' : 'text-white/75'].join(' ')}>
            {teamNameEs(f.away.name)}
          </span>
        </div>
        {(isLive || isDone) && (
          <span className={['text-sm font-bold tabular-nums', awayWin ? 'text-white' : 'text-white/40'].join(' ')}>{f.away.score ?? 0}</span>
        )}
      </div>
    </div>
  );
}

// ── Main banner ───────────────────────────────────────────────────────────────
export default function HeroBanner() {
  const [fixtures, setFixtures] = useState<BannerFixture[]>([]);
  const [userTz, setUserTz]     = useState('America/Mexico_City');
  const [lastUp, setLastUp]     = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  const [goals, setGoals] = useState<GoalEvent[]>([]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch('/api/fixtures');
      if (res.ok) { const d = await res.json(); setFixtures(d.fixtures ?? []); setLastUp(new Date()); }
    } finally { if (!silent) setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    intervalRef.current = setInterval(() => load(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  // Fetch live match details (goal scorers) when Mexico is playing
  const liveMatchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const liveId = fixtures.find(
      (f) => f.status.state === 'in' && (f.home.abbreviation === 'MEX' || f.away.abbreviation === 'MEX')
    )?.id;

    if (liveMatchRef.current) clearInterval(liveMatchRef.current);
    if (!liveId) { setGoals([]); return; }

    const fetchGoals = async () => {
      try {
        const res = await fetch(`/api/match/mundial/${liveId}`);
        if (res.ok) {
          const d = await res.json();
          setGoals(parseGoals(d.plays ?? []));
        }
      } catch { /* ignore */ }
    };

    fetchGoals();
    liveMatchRef.current = setInterval(fetchGoals, 15_000);
    return () => { if (liveMatchRef.current) clearInterval(liveMatchRef.current); };
  }, [fixtures]);

  // Mexico
  const mexAll    = fixtures.filter((f) => f.home.abbreviation === 'MEX' || f.away.abbreviation === 'MEX');
  const mexLive   = mexAll.find((f) => f.status.state === 'in');
  const mexNext   = mexAll.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const countdown = useCountdown(mexNext?.date ?? null);

  const mexGame  = mexLive ?? mexNext;
  const mexHome2 = mexGame ? mexGame.home.abbreviation === 'MEX' : true;
  const rival    = mexGame ? (mexHome2 ? mexGame.away : mexGame.home) : null;

  // Scoreboard
  const allLive     = fixtures.filter((f) => f.status.state === 'in');
  const allToday    = fixtures.filter((f) => f.status.state !== 'in' && isToday(f.date, userTz)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const allUpcoming = fixtures.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const boardFixtures = allLive.length > 0 ? allLive : allToday.length > 0 ? allToday : allUpcoming.slice(0, 8);
  const boardMode: 'live' | 'today' | 'upcoming' = allLive.length > 0 ? 'live' : allToday.length > 0 ? 'today' : 'upcoming';

  function tzLabel(tz: string) {
    try { return new Intl.DateTimeFormat('es-MX', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? tz; }
    catch { return tz; }
  }

  return (
    <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12]">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% -5%, rgba(26,122,120,0.32) 0%, transparent 60%)' }} />

      <div className="relative mx-auto max-w-5xl px-4 pt-6 pb-5 sm:px-6">

        {/* ── Mexico countdown — centered ──────────────────────────────────── */}
        {mexGame && rival ? (
          <div className="flex flex-col items-center text-center gap-4">

            {/* Live badge */}
            {mexLive && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-xs font-bold tracking-widest uppercase text-red-400">En vivo · {mexLive.status.shortDetail}</span>
              </div>
            )}
            {!mexLive && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">Próximo partido</p>
            )}

            {/* Flags + score/vs */}
            <div className="flex items-center justify-center gap-6 sm:gap-10">
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-6xl leading-none sm:text-7xl">🇲🇽</span>
                <span className="text-xs font-bold text-white/50">México</span>
              </div>

              <div className="text-center">
                {mexLive ? (
                  <p className="text-5xl font-bold tabular-nums text-white sm:text-6xl">
                    {mexGame.home.score}<span className="mx-2 text-white/20">–</span>{mexGame.away.score}
                  </p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-white/25">vs</p>
                    <p className="text-xs text-white/30 mt-1">{fmtDay(mexGame.date, userTz)}</p>
                    <p className="text-sm font-bold text-white mt-0.5">{fmtTime(mexGame.date, userTz)}</p>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <span className="text-6xl leading-none sm:text-7xl">{flag(rival.abbreviation)}</span>
                <span className="text-xs font-bold text-white/50">{teamNameEs(rival.name)}</span>
              </div>
            </div>

            {/* Goal scorers — shown only when live */}
            {mexLive && goals.length > 0 && (() => {
              const mexAbbr  = mexGame.home.abbreviation === 'MEX' ? mexGame.home.abbreviation : mexGame.away.abbreviation;
              const rivAbbr  = mexAbbr === 'MEX' ? rival.abbreviation : 'MEX';
              const mexGoals = goals.filter((g) => g.teamAbbr === mexAbbr || (!g.teamAbbr && goals.indexOf(g) % 2 === 0));
              const rivGoals = goals.filter((g) => g.teamAbbr === rivAbbr);
              return (
                <div className="flex w-full max-w-md justify-between gap-4 text-xs">
                  {/* México goals */}
                  <div className="flex flex-col gap-1 flex-1">
                    {mexGoals.map((g, i) => (
                      <span key={i} className="flex items-center gap-1 text-white/70">
                        <span>{g.ownGoal ? '🔴' : '⚽'}</span>
                        <span className="font-semibold">{g.scorer}</span>
                        <span className="text-white/30">{g.clock}</span>
                        {g.ownGoal && <span className="text-[9px] text-red-400">PP</span>}
                      </span>
                    ))}
                  </div>
                  {/* Rival goals */}
                  <div className="flex flex-col gap-1 flex-1 items-end">
                    {rivGoals.map((g, i) => (
                      <span key={i} className="flex items-center gap-1 text-white/50">
                        <span className="text-white/30">{g.clock}</span>
                        <span>{g.ownGoal ? '🔴' : '⚽'}</span>
                        <span className="font-semibold">{g.scorer}</span>
                        {g.ownGoal && <span className="text-[9px] text-red-400">PP</span>}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Countdown — large digits */}
            {!mexLive && countdown.total > 0 && (
              <div className="flex items-end justify-center gap-3 sm:gap-5">
                {([['Días', countdown.days], ['Horas', countdown.hours], ['Min', countdown.mins], ['Seg', countdown.secs]] as const).map(([label, val], i) => (
                  <div key={label} className="flex items-end gap-3 sm:gap-5">
                    {i > 0 && <span className="mb-2 text-2xl font-bold text-white/15 leading-none">:</span>}
                    <div className="flex flex-col items-center">
                      <span className="block text-5xl font-bold tabular-nums text-white sm:text-6xl leading-none">
                        {String(val).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-white/30 mt-1.5">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-2">
            <span className="text-3xl">🇲🇽</span>
            <p className="text-xs text-white/30">Sin partido programado</p>
          </div>
        )}

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <div className="my-5 h-px bg-white/[0.06]" />

        {/* ── Partidos de hoy / en vivo / próximos ─────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {boardMode === 'live' && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold tracking-widest uppercase text-red-400">En vivo</span>
                </span>
              )}
              {boardMode === 'today' && <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Partidos de hoy</span>}
              {boardMode === 'upcoming' && <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">Próximos partidos</span>}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/20">
              <span>{lastUp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: userTz })} {tzLabel(userTz)}</span>
              <button onClick={() => load(false)} disabled={refreshing}
                className="text-white/30 hover:text-white/60 transition disabled:opacity-40">
                {refreshing ? '…' : '↻'}
              </button>
            </div>
          </div>

          {boardFixtures.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-white/20">Sin partidos programados</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-2 min-w-max">
                {boardFixtures.map((f) => <GameCard key={f.id} f={f} tz={userTz} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
