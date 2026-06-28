'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { teamNameEs } from '@/components/standings/teamNames';
import type { MatchSummary } from '@/app/api/match/[league]/[id]/route';

const FLAG: Record<string, string> = {
  MEX: '🇲🇽', ECU: '🇪🇨', USA: '🇺🇸', CAN: '🇨🇦', ARG: '🇦🇷', BRA: '🇧🇷',
  GER: '🇩🇪', FRA: '🇫🇷', ESP: '🇪🇸', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', POR: '🇵🇹', COL: '🇨🇴',
  URU: '🇺🇾', NOR: '🇳🇴', NED: '🇳🇱', CIV: '🇨🇮', KOR: '🇰🇷', JPN: '🇯🇵',
  BEL: '🇧🇪', CRO: '🇭🇷', GHA: '🇬🇭', EGY: '🇪🇬', IRN: '🇮🇷', KSA: '🇸🇦',
  CPV: '🇨🇻', MAR: '🇲🇦', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', NZL: '🇳🇿', PAR: '🇵🇾', PAN: '🇵🇦',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Props { league: string; id: string }

export default function MatchView({ league, id }: Props) {
  const [data, setData]       = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [tab, setTab]         = useState<'resumen' | 'estadisticas' | 'alineaciones' | 'eventos'>('resumen');
  const [userTz, setUserTz]   = useState('America/Mexico_City');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/match/${league}/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [league, id]);

  useEffect(() => {
    if (!data || data.header.status.state !== 'in') return;
    const timer = setInterval(() => {
      fetch(`/api/match/${league}/${id}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setData(d); })
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(timer);
  }, [data, league, id]);

  const backHref = league === 'liga-mx' ? '/liga-mx' : '/tabla';
  const backLabel = league === 'liga-mx' ? 'Liga MX' : 'Mundial 2026';

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f6f6] dark:bg-bg-1">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent mx-auto" />
        <p className="mt-3 text-xs text-gray-400 dark:text-white/30">Cargando partido…</p>
      </div>
    </div>
  );

  if (error || !data) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f0f6f6] dark:bg-bg-1">
      <p className="text-sm text-gray-500 dark:text-white/40">No se pudo cargar la información del partido.</p>
      <Link href={backHref} className="text-sm text-brand-orange hover:underline">← Volver a {backLabel}</Link>
    </div>
  );

  const { header, stats, rosters, plays } = data;
  const isLive = header.status.state === 'in';
  const isDone = header.status.state === 'post';

  return (
    <div className="min-h-screen bg-[#f0f6f6] dark:bg-bg-1 font-display text-gray-900 dark:text-white">

      {/* ── Match hero ── */}
      <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12] px-4 pt-6 pb-8">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: 'radial-gradient(ellipse 60% 80% at 50% -20%, #f07820 0%, transparent 70%)' }} />

        {/* Back link */}
        <div className="relative mx-auto max-w-5xl mb-6">
          <Link href={backHref} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            {backLabel}
          </Link>
        </div>

        {/* Scoreboard */}
        <div className="relative mx-auto max-w-5xl">
          {/* Status */}
          <div className="flex justify-center mb-4">
            {isLive ? (
              <span className="flex items-center gap-2 rounded-full bg-red-500/20 border border-red-500/30 px-4 py-1 text-sm font-bold text-red-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                {header.status.shortDetail}
              </span>
            ) : isDone ? (
              <span className="rounded-full bg-white/10 px-4 py-1 text-xs font-bold text-white/50">Partido finalizado</span>
            ) : (
              <span className="rounded-full bg-brand-teal/20 px-4 py-1 text-xs font-bold text-brand-teal">
                {header.date ? `${fmtDate(header.date, userTz)} · ${fmtTime(header.date, userTz)}` : 'Próximamente'}
              </span>
            )}
          </div>

          {/* Teams */}
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="text-center">
              <span className="block text-4xl sm:text-5xl mb-2">{flag(header.home.abbreviation)}</span>
              <p className="text-sm font-bold text-white">{teamNameEs(header.home.name)}</p>
            </div>

            <div className="text-center">
              {(isLive || isDone) ? (
                <div>
                  <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums">
                    {header.home.score ?? 0}
                    <span className="text-white/30 mx-2">–</span>
                    {header.away.score ?? 0}
                  </p>
                  {isLive && header.status.displayClock && (
                    <p className="text-xs text-red-400 mt-1">{header.status.displayClock}</p>
                  )}
                </div>
              ) : (
                <p className="text-2xl font-bold text-white/30">vs</p>
              )}
            </div>

            <div className="text-center">
              <span className="block text-4xl sm:text-5xl mb-2">{flag(header.away.abbreviation)}</span>
              <p className="text-sm font-bold text-white">{teamNameEs(header.away.name)}</p>
            </div>
          </div>

          {header.venue && (
            <p className="text-center text-xs text-white/25 mt-4">{header.venue}{header.city ? ` · ${header.city}` : ''}</p>
          )}
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-white/[0.05] p-1 overflow-x-auto">
          {(['resumen', 'estadisticas', 'alineaciones', 'eventos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={['shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold tracking-wide transition-all',
                tab === t ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70'].join(' ')}>
              {t === 'resumen' ? 'Resumen' : t === 'estadisticas' ? 'Estadísticas' : t === 'alineaciones' ? 'Alineaciones' : 'Eventos'}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-6 pb-16 sm:px-6">

        {/* ── Resumen (key plays) ── */}
        {tab === 'resumen' && (
          plays.length === 0
            ? <EmptyState text="Sin eventos disponibles aún" />
            : (
              <div className="space-y-2">
                {plays.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.02] px-4 py-3">
                    <span className="shrink-0 rounded bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-white/40 tabular-nums">
                      {p.period}P {p.clock}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{p.type}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5 line-clamp-2">{p.text}</p>
                    </div>
                    {p.teamAbbr && <span className="shrink-0 text-sm">{flag(p.teamAbbr)}</span>}
                  </div>
                ))}
              </div>
            )
        )}

        {/* ── Estadísticas ── */}
        {tab === 'estadisticas' && (
          stats.length === 0
            ? <EmptyState text="Estadísticas no disponibles" />
            : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
                {/* Header */}
                <div className="grid grid-cols-3 border-b border-gray-100 dark:border-white/[0.04] px-5 py-3">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">{teamNameEs(header.home.name)}</span>
                  <span className="text-center text-[10px] text-gray-400 dark:text-white/30 uppercase tracking-wider">Estadística</span>
                  <span className="text-right text-xs font-bold text-gray-900 dark:text-white">{teamNameEs(header.away.name)}</span>
                </div>
                {stats.map((s, i) => {
                  const hv = Number(s.home) || 0;
                  const av = Number(s.away) || 0;
                  const total = hv + av || 1;
                  const hPct = (hv / total) * 100;
                  return (
                    <div key={i} className={['px-5 py-3', i < stats.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''].join(' ')}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold">{s.home}</span>
                        <span className="text-[10px] text-gray-400 dark:text-white/30">{s.name}</span>
                        <span className="text-sm font-bold">{s.away}</span>
                      </div>
                      <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-gray-100 dark:bg-white/[0.06]">
                        <div className="h-full bg-brand-orange rounded-l-full" style={{ width: `${hPct}%` }} />
                        <div className="h-full bg-brand-teal rounded-r-full" style={{ width: `${100 - hPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )
        )}

        {/* ── Alineaciones ── */}
        {tab === 'alineaciones' && (
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { label: teamNameEs(header.home.name), flag: flag(header.home.abbreviation), players: rosters.home },
              { label: teamNameEs(header.away.name), flag: flag(header.away.abbreviation), players: rosters.away },
            ].map(({ label, flag: f, players }) => (
              <div key={label} className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]">
                <div className="border-b border-gray-100 dark:border-white/[0.04] px-5 py-3">
                  <p className="text-sm font-bold">{f} {label}</p>
                </div>
                {players.length === 0
                  ? <p className="px-5 py-6 text-xs text-gray-400 dark:text-white/25 text-center">Alineación no disponible</p>
                  : players.map((p, i) => (
                    <div key={i} className={['flex items-center gap-3 px-5 py-2.5', i < players.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : ''].join(' ')}>
                      <span className="w-6 text-center text-xs text-gray-400 dark:text-white/30 font-mono">{p.jersey}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-white/30">{p.position}</p>
                      </div>
                      {p.starter && <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-brand-orange/10 text-brand-orange">Titular</span>}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* ── Eventos (all plays) ── */}
        {tab === 'eventos' && (
          plays.length === 0
            ? <EmptyState text="Sin eventos disponibles" />
            : (
              <div className="space-y-1.5">
                {plays.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-white/[0.04] bg-white dark:bg-white/[0.02] px-4 py-2">
                    <span className="shrink-0 w-16 text-right text-[10px] text-gray-400 dark:text-white/30 tabular-nums">{p.period}P {p.clock}</span>
                    <span className="shrink-0 text-sm">{p.teamAbbr ? flag(p.teamAbbr) : '·'}</span>
                    <p className="text-xs text-gray-700 dark:text-white/70 line-clamp-1">{p.text}</p>
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-gray-200 dark:border-white/[0.05] p-10 text-center text-sm text-gray-400 dark:text-white/25">{text}</div>;
}
