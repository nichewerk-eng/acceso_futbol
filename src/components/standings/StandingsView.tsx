'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import BracketView from './BracketView';
import BracketSimulator from './BracketSimulator';
import { downloadGroupImage, downloadGroupImageWithPhoto } from './generateImage';
import { teamNameEs } from './teamNames';
import type { Fixture, Group } from './types';

// ── Flag emoji map ─────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  MEX: '🇲🇽', KOR: '🇰🇷', CZE: '🇨🇿', RSA: '🇿🇦',
  CAN: '🇨🇦', BIH: '🇧🇦', SUI: '🇨🇭', QAT: '🇶🇦',
  BRA: '🇧🇷', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', MAR: '🇲🇦',
  PAR: '🇵🇾', TUR: '🇹🇷', AUS: '🇦🇺', USA: '🇺🇸',
  ECU: '🇪🇨', GER: '🇩🇪', CIV: '🇨🇮', CUW: '🇨🇼',
  NED: '🇳🇱', SWE: '🇸🇪', JPN: '🇯🇵', TUN: '🇹🇳',
  BEL: '🇧🇪', IRN: '🇮🇷', EGY: '🇪🇬', NZL: '🇳🇿',
  ESP: '🇪🇸', URU: '🇺🇾', KSA: '🇸🇦', CPV: '🇨🇻',
  NOR: '🇳🇴', FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶',
  ARG: '🇦🇷', AUT: '🇦🇹', ALG: '🇩🇿', JOR: '🇯🇴',
  COL: '🇨🇴', POR: '🇵🇹', UZB: '🇺🇿', COD: '🇨🇩',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', PAN: '🇵🇦', GHA: '🇬🇭',
};
const flag = (abbr: string) => FLAG[abbr] ?? '🏳️';

// ── Date helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: tz, day: 'numeric', month: 'short',
  });
}
function fmtTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('es-MX', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
function tzLabel(tz: string) {
  try {
    const parts = new Intl.DateTimeFormat('es-MX', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch { return tz; }
}
function isToday(iso: string, tz: string) {
  const d = new Date(iso).toLocaleDateString('es-MX', { timeZone: tz });
  const n = new Date().toLocaleDateString('es-MX', { timeZone: tz });
  return d === n;
}

// ── Mexico countdown hook ───────────────────────────────────────────────────────
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
  return {
    days:  Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins:  Math.floor((s % 3600) / 60),
    secs:  s % 60,
    total: diff,
  };
}

// ── Types ───────────────────────────────────────────────────────────────────────
interface Props { initialGroups: Group[]; initialFixtures: Fixture[]; }
const GROUP_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
type View = 'tabla' | 'cuadro' | 'simulador';

// ── Main component ─────────────────────────────────────────────────────────────
export default function StandingsView({ initialGroups, initialFixtures }: Props) {
  const [groups, setGroups]               = useState<Group[]>(initialGroups);
  const [fixtures, setFixtures]           = useState<Fixture[]>(initialFixtures);
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [view, setView]                   = useState<View>('tabla');
  const [theme, setTheme]                 = useState<'dark' | 'light'>('dark');
  const [lastUpdated, setLastUpdated]     = useState(new Date());
  const [refreshing, setRefreshing]       = useState(false);
  const [copied, setCopied]               = useState(false);
  const [downloading, setDownloading]     = useState(false);
  const [userTz, setUserTz]               = useState('America/Mexico_City');
  const [bgPhotoUrl, setBgPhotoUrl]       = useState<string | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setUserTz(tz);
    const saved = localStorage.getItem('af-theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      localStorage.setItem('af-theme', next);
      return next;
    });
  }

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [sRes, fRes] = await Promise.all([fetch('/api/standings'), fetch('/api/fixtures')]);
      if (sRes.ok) { const { groups: g } = await sRes.json(); setGroups(g); }
      if (fRes.ok) { const { fixtures: f } = await fRes.json(); setFixtures(f); }
      setLastUpdated(new Date());
    } finally { if (!silent) setRefreshing(false); }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => refresh(true), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh]);

  // ── Derived: current group fixtures ─────────────────────────────────────────
  const currentGroup = groups.find((g) => g.abbreviation === `Group ${selectedGroup}`);
  const groupTeamNames = new Set(currentGroup?.entries.map((e) => e.team.name) ?? []);
  const groupFixtures = fixtures.filter((f) => groupTeamNames.has(f.home.name) && groupTeamNames.has(f.away.name));
  const pastFixtures = groupFixtures.filter((f) => f.status.state === 'post').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const liveFixtures = groupFixtures.filter((f) => f.status.state === 'in');
  const upcomingFixtures = groupFixtures.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── Derived: jumbotron fixtures (all groups) ─────────────────────────────────
  const allLive = fixtures.filter((f) => f.status.state === 'in');
  const allToday = fixtures.filter((f) => f.status.state !== 'in' && isToday(f.date, userTz)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const allUpcoming = fixtures.filter((f) => f.status.state === 'pre').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const jumboFixtures = allLive.length > 0 ? allLive
    : allToday.length > 0 ? allToday
    : allUpcoming.slice(0, 8);
  const jumboMode: 'live' | 'today' | 'upcoming' =
    allLive.length > 0 ? 'live' : allToday.length > 0 ? 'today' : 'upcoming';

  // ── Mexico next match countdown ───────────────────────────────────────────────
  const mexFixtures = fixtures.filter((f) => f.home.abbreviation === 'MEX' || f.away.abbreviation === 'MEX');
  const mexLive   = mexFixtures.find((f) => f.status.state === 'in');
  const mexNext   = mexFixtures.filter((f) => f.status.state === 'pre')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const countdown = useCountdown(mexNext?.date ?? null);

  // ── Download / share handlers ────────────────────────────────────────────────
  async function handleShare() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* ignore */ }
  }
  async function handleDownload() {
    if (!currentGroup) return;
    setDownloading(true);
    try {
      if (bgPhotoUrl) {
        await downloadGroupImageWithPhoto(currentGroup, pastFixtures, upcomingFixtures, selectedGroup, userTz, bgPhotoUrl);
      } else {
        await downloadGroupImage(currentGroup, pastFixtures, upcomingFixtures, selectedGroup, userTz);
      }
    } finally { setDownloading(false); }
  }
  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => { if (typeof evt.target?.result === 'string') setBgPhotoUrl(evt.target.result); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const dark = theme === 'dark';

  return (
    <div className={`${dark ? 'dark' : ''} min-h-screen font-display transition-colors duration-300 bg-[#f0f6f6] dark:bg-bg-1 text-gray-900 dark:text-white`}>

      {/* ── STICKY NAVBAR ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-bg-1/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">

          {/* Logo */}
          <Image
            src="/acceso_futbol_logo_logo_transparent_bg.PNG"
            alt="Acceso Futbol"
            width={240}
            height={80}
            className="h-8 w-auto object-contain sm:h-10"
            priority
          />

          {/* Tab navigation */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/[0.06] p-1">
            {([['tabla', 'Grupos'], ['cuadro', 'R32'], ['simulador', 'Simulador']] as const).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v as View)}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all duration-200',
                  view === v
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70',
                ].join(' ')}
              >
                <span className="hidden sm:inline">
                  {v === 'cuadro' ? 'Cuadro R32' : label}
                </span>
                <span className="sm:hidden">{label}</span>
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <a
              href="https://www.tiktok.com/@accesofutbolmx"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_16px_rgba(240,120,32,0.3)] hover:bg-brand-orange/90 transition"
            >
              <TikTokIcon />
              Seguir
            </a>
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/5 transition hover:border-brand-orange/50"
              aria-label={dark ? 'Modo claro' : 'Modo oscuro'}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        {/* Brand gradient rule */}
        <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(240,120,32,0.5), rgba(255,255,255,0.04), rgba(26,122,120,0.5))' }} />
      </nav>

      {/* ── JUMBOTRON HERO ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gray-900 dark:bg-[#080d12]">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% -10%, #f07820 0%, transparent 65%)' }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-5 sm:px-6">
          {/* Jumbotron label */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {jumboMode === 'live' && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-red-400">En vivo</span>
                </span>
              )}
              {jumboMode === 'today' && (
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Partidos de hoy</span>
              )}
              {jumboMode === 'upcoming' && (
                <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">Próximos partidos</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/25">
                {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: userTz })} {tzLabel(userTz)}
              </span>
              <button
                onClick={() => refresh(false)}
                disabled={refreshing}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-white/30 transition hover:text-white/60 disabled:opacity-40"
              >
                <RefreshIcon spinning={refreshing} />
                {refreshing ? 'Actualizando…' : 'Actualizar'}
              </button>
            </div>
          </div>

          {/* Scoreboard cards — horizontal scroll */}
          {jumboFixtures.length === 0 ? (
            <div className="py-6 text-center text-xs text-white/20">Sin partidos programados</div>
          ) : (
            <div className="overflow-x-auto pb-1 -mx-4 px-4">
              <div className="flex gap-3 min-w-max">
                {jumboFixtures.map((f) => (
                  <JumboCard key={f.id} fixture={f} tz={userTz} />
                ))}
              </div>
            </div>
          )}

          {/* ── Mexico countdown strip ─────────────────────────────────────────── */}
          {(mexLive || mexNext) && (
            <div className="mt-4 rounded-2xl border border-[#1a7a78]/40 bg-[#080d12]/60 backdrop-blur px-5 py-4">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">

                {/* Match info */}
                <div className="flex items-center gap-3">
                  {mexLive ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> En vivo
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a7a78]/80">🇲🇽 Próximo partido</span>
                  )}
                </div>

                {(() => {
                  const game = mexLive ?? mexNext!;
                  const mexHome = game.home.abbreviation === 'MEX';
                  const rival   = mexHome ? game.away : game.home;
                  const rivalFlag = flag(rival.abbreviation);
                  return (
                    <div className="flex items-center gap-4 text-white">
                      <span className="text-2xl">🇲🇽</span>
                      <div className="text-center">
                        <p className="text-sm font-bold">
                          México vs {teamNameEs(rival.name)}
                        </p>
                        {mexLive ? (
                          <p className="text-xs font-bold text-red-400 tabular-nums">
                            {game.home.score} – {game.away.score}
                            <span className="ml-2 text-white/30">{game.status.shortDetail}</span>
                          </p>
                        ) : (
                          <p className="text-[11px] text-white/40">
                            {new Date(game.date).toLocaleDateString('es-MX', { timeZone: userTz, weekday: 'long', day: 'numeric', month: 'long' })}
                            {' · '}{fmtTime(game.date, userTz)}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl">{rivalFlag}</span>
                    </div>
                  );
                })()}

                {/* Countdown blocks */}
                {!mexLive && countdown.total > 0 && (
                  <div className="flex items-center gap-3">
                    {([['Días', countdown.days], ['Hrs', countdown.hours], ['Min', countdown.mins], ['Seg', countdown.secs]] as const).map(([label, val]) => (
                      <div key={label} className="flex flex-col items-center">
                        <span className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
                          {String(val).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-white/30">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">

        {/* ─── GRUPOS TAB ─────────────────────────────────────────────────────── */}
        {view === 'tabla' && (
          <>
            {/* Group selector */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max gap-1.5 rounded-xl bg-gray-100 dark:bg-white/5 p-1.5">
                {GROUP_LETTERS.map((letter) => {
                  const active = letter === selectedGroup;
                  return (
                    <button
                      key={letter}
                      onClick={() => setSelectedGroup(letter)}
                      className={[
                        'relative rounded-lg px-2.5 sm:px-3.5 py-1.5 text-sm font-semibold tracking-wider transition-all duration-200',
                        active
                          ? 'bg-brand-orange text-white shadow-lg'
                          : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10',
                      ].join(' ')}
                    >
                      {active && (
                        <span className="absolute inset-0 rounded-lg opacity-30 blur-md" style={{ background: '#f07820' }} />
                      )}
                      <span className="relative">
                        <span className="sm:hidden">{letter}</span>
                        <span className="hidden sm:inline">Grupo {letter}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timezone info */}
            <div className="mb-4 text-right">
              <span className="text-[10px] text-gray-400 dark:text-white/25 tracking-wide">
                Horarios en {tzLabel(userTz)}
              </span>
            </div>

            {currentGroup ? (
              <>
                {/* Standings table */}
                <div className="mb-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] backdrop-blur-sm shadow-sm dark:shadow-none">
                  {/* Table header */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.06] px-5 py-3.5">
                    <div>
                      <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-gray-700 dark:text-white/70">
                        Grupo {selectedGroup}
                      </h2>
                      <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">Jornada en curso</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFileChange} />
                      {bgPhotoUrl ? (
                        <div className="flex items-center gap-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={bgPhotoUrl} alt="Foto de fondo"
                            className="h-7 w-7 rounded object-cover border border-green-400/50 cursor-pointer"
                            onClick={() => photoInputRef.current?.click()}
                            title="Cambiar foto"
                          />
                          <button onClick={() => setBgPhotoUrl(null)} title="Quitar foto"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 dark:border-white/[0.08] text-xs text-gray-400 transition hover:border-red-400/50 hover:text-red-400">
                            <XIcon />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => photoInputRef.current?.click()} title="Subir foto de fondo"
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] px-2.5 py-1.5 text-xs text-gray-500 dark:text-white/50 transition hover:border-brand-teal/50 hover:text-brand-teal">
                          <CameraIcon />
                          <span className="hidden sm:inline">Subir foto</span>
                        </button>
                      )}
                      <button onClick={handleDownload} disabled={downloading}
                        title={bgPhotoUrl ? 'Descargar imagen con foto' : 'Descargar imagen TikTok 4K'}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:opacity-40 disabled:cursor-not-allowed ${bgPhotoUrl ? 'border-brand-orange/50 text-brand-orange hover:bg-orange-50 dark:hover:bg-orange-950/20' : 'border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/50 hover:border-brand-orange/50 hover:text-brand-orange'}`}>
                        <DownloadIcon spinning={downloading} />
                        <span className="hidden sm:inline">{downloading ? 'Generando…' : bgPhotoUrl ? 'Con foto' : 'Imagen 4K'}</span>
                      </button>
                      <button onClick={handleShare}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] px-2.5 py-1.5 text-xs text-gray-500 dark:text-white/50 transition hover:border-brand-orange/50 hover:text-brand-orange">
                        <ShareIcon />
                        <span className="hidden sm:inline">{copied ? 'Copiado ✓' : 'Compartir'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2.5rem_2.5rem] sm:grid-cols-[2.5rem_1fr_repeat(7,2.5rem)_3rem] gap-x-1 border-b border-gray-100 dark:border-white/[0.04] px-4 sm:px-5 py-2 text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/25">
                    <span className="text-center">#</span>
                    <span>Equipo</span>
                    <span className="text-center">PJ</span>
                    <span className="text-center">G</span>
                    <span className="hidden text-center sm:block">E</span>
                    <span className="hidden text-center sm:block">P</span>
                    <span className="hidden text-center sm:block">GF</span>
                    <span className="hidden text-center sm:block">GC</span>
                    <span className="text-center">DG</span>
                    <span className="text-center">Pts</span>
                  </div>

                  {/* Rows */}
                  {currentGroup.entries.map((entry, idx) => {
                    const isTop2 = entry.position <= 2;
                    const isFirst = entry.position === 1;
                    return (
                      <div key={entry.team.id}
                        className={['group grid grid-cols-[2rem_1fr_2rem_2rem_2.5rem_2.5rem] sm:grid-cols-[2.5rem_1fr_repeat(7,2.5rem)_3rem] gap-x-1 px-4 sm:px-5 py-3.5 transition-colors duration-150',
                          idx < currentGroup.entries.length - 1 ? 'border-b border-gray-100 dark:border-white/[0.04]' : '',
                          'hover:bg-gray-50 dark:hover:bg-white/[0.03]'].join(' ')}>
                        <div className="flex items-center justify-center">
                          <span className={['flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs font-bold',
                            isFirst ? 'bg-brand-orange/20 text-brand-orange'
                              : isTop2 ? 'bg-brand-teal/20 text-brand-teal'
                              : 'text-gray-400 dark:text-white/30'].join(' ')}>
                            {entry.position}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          <span className="text-base sm:text-lg leading-none" aria-hidden>{flag(entry.team.abbreviation)}</span>
                          <span className={['truncate text-xs sm:text-sm font-semibold',
                            isFirst ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-white/80'].join(' ')}>
                            {teamNameEs(entry.team.name)}
                          </span>
                          {isTop2 && (
                            <span className={['hidden shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase sm:block',
                              isFirst ? 'bg-brand-orange/15 text-brand-orange' : 'bg-brand-teal/15 text-brand-teal'].join(' ')}>
                              {isFirst ? 'Líder' : 'Clasifica'}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center justify-center text-xs sm:text-sm text-gray-500 dark:text-white/50">{entry.gp}</span>
                        <span className="flex items-center justify-center text-xs sm:text-sm text-gray-500 dark:text-white/50">{entry.w}</span>
                        <span className="hidden items-center justify-center text-sm text-gray-500 dark:text-white/50 sm:flex">{entry.d}</span>
                        <span className="hidden items-center justify-center text-sm text-gray-500 dark:text-white/50 sm:flex">{entry.l}</span>
                        <span className="hidden items-center justify-center text-sm text-gray-500 dark:text-white/50 sm:flex">{entry.gf}</span>
                        <span className="hidden items-center justify-center text-sm text-gray-500 dark:text-white/50 sm:flex">{entry.ga}</span>
                        <span className={['flex items-center justify-center text-xs sm:text-sm font-medium',
                          entry.gd.startsWith('+') ? 'text-emerald-500 dark:text-emerald-400'
                            : entry.gd.startsWith('-') ? 'text-red-500 dark:text-red-400'
                            : 'text-gray-500 dark:text-white/50'].join(' ')}>
                          {entry.gd}
                        </span>
                        <div className="flex items-center justify-center">
                          <span className={['flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-xs sm:text-sm font-bold',
                            isFirst ? 'bg-brand-orange text-white shadow-[0_0_12px_rgba(240,120,32,0.4)]'
                              : isTop2 ? 'bg-brand-teal/20 dark:bg-brand-teal/30 text-brand-teal'
                              : entry.pts > 0 ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/70'
                              : 'text-gray-300 dark:text-white/25'].join(' ')}>
                            {entry.pts}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 border-t border-gray-100 dark:border-white/[0.04] px-5 py-3">
                    <LegendDot color="brand-orange" label="Líder de grupo" />
                    <LegendDot color="brand-teal" label="Clasifica (Top 2)" />
                  </div>
                </div>

                {/* Live now */}
                {liveFixtures.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      <span className="text-xs font-bold tracking-[0.2em] uppercase text-red-500 dark:text-red-400">En vivo ahora</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      {liveFixtures.map((f) => <LiveFixtureCard key={f.id} fixture={f} tz={userTz} />)}
                    </div>
                  </div>
                )}

                {/* Fixtures grid */}
                <div className="grid gap-6 sm:grid-cols-2">
                  <section>
                    <SectionTitle label="Resultados" />
                    {pastFixtures.length === 0
                      ? <EmptyState text="Sin partidos disputados aún" />
                      : <div className="flex flex-col gap-2">{pastFixtures.map((f) => <ResultCard key={f.id} fixture={f} tz={userTz} />)}</div>}
                  </section>
                  <section>
                    <SectionTitle label="Próximos partidos" />
                    {upcomingFixtures.length === 0
                      ? <EmptyState text="No hay más partidos programados" />
                      : <div className="flex flex-col gap-2">{upcomingFixtures.map((f) => <UpcomingCard key={f.id} fixture={f} tz={userTz} />)}</div>}
                  </section>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center py-24 text-gray-400 dark:text-white/30">Cargando datos…</div>
            )}
          </>
        )}

        {/* ─── CUADRO R32 TAB ─────────────────────────────────────────────────── */}
        {view === 'cuadro' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold tracking-wide text-gray-900 dark:text-white">Cuadro de Dieciseisavos</h2>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-1">Clasificación proyectada según posiciones actuales · Reglas oficiales FIFA Anexo C</p>
            </div>
            <BracketView groups={groups} userTz={userTz} />
          </div>
        )}

        {/* ─── SIMULADOR TAB ──────────────────────────────────────────────────── */}
        {view === 'simulador' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold tracking-wide text-gray-900 dark:text-white">Simulador de Bracket</h2>
              <p className="text-xs text-gray-400 dark:text-white/30 mt-1">Elige los ganadores y simula tu propio camino al título</p>
            </div>
            <BracketSimulator groups={groups} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 flex flex-col items-center gap-2 text-center text-xs text-gray-400 dark:text-white/20">
          <Image
            src="/acceso_futbol_logo_logo_transparent_bg.PNG"
            alt="Acceso Futbol" width={160} height={54}
            className="h-10 w-auto object-contain opacity-50"
          />
          <span>Datos via ESPN · Se actualiza cada 30 segundos</span>
        </footer>
      </div>
    </div>
  );
}

// ── Jumbotron match card ───────────────────────────────────────────────────────
function JumboCard({ fixture: f, tz }: { fixture: Fixture; tz: string }) {
  const isLive = f.status.state === 'in';
  const isDone = f.status.state === 'post';
  const homeWin = isDone && Number(f.home.score) > Number(f.away.score);
  const awayWin = isDone && Number(f.away.score) > Number(f.home.score);

  return (
    <div className={[
      'flex flex-col gap-2 rounded-2xl border px-4 py-3.5 transition-all duration-200 min-w-[160px] sm:min-w-[180px]',
      isLive
        ? 'border-red-500/30 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
        : isDone
          ? 'border-white/[0.06] bg-white/[0.03]'
          : 'border-white/[0.06] bg-white/[0.03]',
    ].join(' ')}>
      {/* Status badge */}
      <div className="flex items-center justify-between">
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-red-400">
              {f.status.shortDetail}
            </span>
          </div>
        ) : isDone ? (
          <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-white/40">FT</span>
        ) : (
          <span className="rounded bg-brand-teal/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-teal">{fmtTime(f.date, tz)}</span>
        )}
        <span className="text-[9px] text-white/20">{fmtDate(f.date, tz)}</span>
      </div>

      {/* Teams + score */}
      <div className="flex flex-col gap-1.5">
        <TeamScoreRow
          abbr={f.home.abbreviation}
          name={teamNameEs(f.home.name)}
          score={f.home.score}
          isWinner={homeWin}
          isLive={isLive}
          isDone={isDone}
        />
        <TeamScoreRow
          abbr={f.away.abbreviation}
          name={teamNameEs(f.away.name)}
          score={f.away.score}
          isWinner={awayWin}
          isLive={isLive}
          isDone={isDone}
        />
      </div>
    </div>
  );
}

function TeamScoreRow({ abbr, name, score, isWinner, isLive, isDone }: {
  abbr: string; name: string; score: string | null;
  isWinner: boolean; isLive: boolean; isDone: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base leading-none shrink-0">{FLAG[abbr] ?? '🏳️'}</span>
        <span className={['truncate text-xs font-semibold max-w-[80px]',
          isWinner ? 'text-white' : isDone ? 'text-white/40' : 'text-white/70'].join(' ')}>
          {name}
        </span>
      </div>
      {(isLive || isDone) && (
        <span className={['text-sm font-bold tabular-nums shrink-0',
          isWinner ? 'text-white' : 'text-white/40'].join(' ')}>
          {score ?? 0}
        </span>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
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
function LegendDot({ color, label }: { color: 'brand-orange' | 'brand-teal'; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={['h-2 w-2 rounded-full', color === 'brand-orange' ? 'bg-brand-orange' : 'bg-brand-teal'].join(' ')} />
      <span className="text-[10px] text-gray-400 dark:text-white/30">{label}</span>
    </div>
  );
}
function ResultCard({ fixture: f, tz }: { fixture: Fixture; tz: string }) {
  const homeWin = Number(f.home.score) > Number(f.away.score);
  const awayWin = Number(f.away.score) > Number(f.home.score);
  return (
    <div className="group rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] px-4 py-3 transition hover:border-gray-300 dark:hover:border-white/[0.1] hover:bg-white dark:hover:bg-white/[0.04]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-white/30">{fmtDate(f.date, tz)}</span>
        <span className="rounded bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold text-gray-500 dark:text-white/40">FT</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-base">{flag(f.home.abbreviation)}</span>
          <span className={['truncate text-sm font-semibold', homeWin ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/50'].join(' ')}>{teamNameEs(f.home.name)}</span>
        </div>
        <div className="shrink-0 text-center">
          <span className="text-lg font-bold tracking-wider text-brand-orange">{f.home.score}<span className="mx-1 text-gray-300 dark:text-white/20">–</span>{f.away.score}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-1.5">
          <span className="text-base">{flag(f.away.abbreviation)}</span>
          <span className={['truncate text-sm font-semibold text-right', awayWin ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/50'].join(' ')}>{teamNameEs(f.away.name)}</span>
        </div>
      </div>
      {f.city && <p className="mt-1 text-center text-[10px] text-gray-400 dark:text-white/20">{f.city}</p>}
    </div>
  );
}
function UpcomingCard({ fixture: f, tz }: { fixture: Fixture; tz: string }) {
  return (
    <div className="group rounded-xl border border-gray-200 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02] px-4 py-3 transition hover:border-brand-teal/40 dark:hover:border-brand-teal/30 hover:bg-white dark:hover:bg-white/[0.04]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 dark:text-white/30">{fmtDate(f.date, tz)}</span>
        <span className="rounded bg-brand-teal/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-teal">{fmtTime(f.date, tz)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-base">{flag(f.home.abbreviation)}</span>
          <span className="truncate text-sm font-semibold text-gray-600 dark:text-white/70">{teamNameEs(f.home.name)}</span>
        </div>
        <span className="shrink-0 text-sm font-bold text-gray-300 dark:text-white/20">vs</span>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-1.5">
          <span className="text-base">{flag(f.away.abbreviation)}</span>
          <span className="truncate text-right text-sm font-semibold text-gray-600 dark:text-white/70">{teamNameEs(f.away.name)}</span>
        </div>
      </div>
      {f.city && <p className="mt-1 text-center text-[10px] text-gray-400 dark:text-white/20">{f.city}</p>}
    </div>
  );
}
function LiveFixtureCard({ fixture: f, tz }: { fixture: Fixture; tz: string }) {
  return (
    <div className="rounded-xl border border-red-400/20 bg-red-50 dark:bg-red-500/5 px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-wider uppercase text-red-500 dark:text-red-400">{f.status.shortDetail}</span>
        <span className="text-[10px] text-gray-400 dark:text-white/30">{f.city ?? fmtTime(f.date, tz)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-xl">{flag(f.home.abbreviation)}</span>
          <span className="truncate font-bold text-gray-900 dark:text-white">{teamNameEs(f.home.name)}</span>
        </div>
        <div className="shrink-0 text-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {f.home.score ?? 0}<span className="mx-2 text-gray-300 dark:text-white/30">–</span>{f.away.score ?? 0}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-2">
          <span className="text-xl">{flag(f.away.abbreviation)}</span>
          <span className="truncate text-right font-bold text-gray-900 dark:text-white">{teamNameEs(f.away.name)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function RefreshIcon({ spinning }: { spinning: boolean }) {
  return <svg className={['h-3.5 w-3.5', spinning ? 'animate-spin' : ''].join(' ')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
}
function ShareIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>;
}
function CameraIcon() {
  return <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>;
}
function XIcon() {
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function DownloadIcon({ spinning }: { spinning: boolean }) {
  if (spinning) return <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
  return <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
}
function SunIcon() {
  return <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function MoonIcon() {
  return <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
}
function TikTokIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" /></svg>;
}
