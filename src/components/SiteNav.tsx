'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/tabla',      label: 'Mundial 2026' },
  { href: '/seleccion', label: 'Selección' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
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

  const dark = theme === 'dark';

  return (
    <nav className={`${dark ? 'dark' : ''} sticky top-0 z-50 border-b border-gray-200/80 dark:border-white/[0.06] bg-white/95 dark:bg-bg-1/95 backdrop-blur-md font-display`}>
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/tabla" className="shrink-0">
          <Image
            src="/acceso_futbol_logo_logo_transparent_bg.PNG"
            alt="Acceso Futbol"
            width={200} height={66}
            className="h-8 w-auto object-contain sm:h-9"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1 ml-4">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href} href={href}
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide transition-all',
                  active
                    ? 'bg-brand-orange/10 text-brand-orange'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <a
            href="https://www.tiktok.com/@accesofutbolmx"
            target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-orange/90"
          >
            <TikTokIcon />
            Seguir
          </a>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/5 transition hover:border-brand-orange/50"
            aria-label="Cambiar tema"
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/5"
            aria-label="Menú"
          >
            <MenuIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 dark:border-white/[0.06] bg-white dark:bg-bg-1 px-4 pb-4 pt-2">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href} href={href}
                onClick={() => setMobileOpen(false)}
                className={[
                  'block rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                  active
                    ? 'text-brand-orange bg-brand-orange/10'
                    : 'text-gray-600 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/[0.05]',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
          <a
            href="https://www.tiktok.com/@accesofutbolmx"
            target="_blank" rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 rounded-lg bg-brand-orange/10 px-3 py-2.5 text-sm font-bold text-brand-orange"
          >
            <TikTokIcon />
            @accesofutbolmx en TikTok
          </a>
        </div>
      )}

      {/* Brand gradient rule */}
      <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(240,120,32,0.5), rgba(255,255,255,0.04), rgba(26,122,120,0.5))' }} />
    </nav>
  );
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" /></svg>;
}
function SunIcon() {
  return <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
}
function MoonIcon() {
  return <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>;
}
function MenuIcon({ open }: { open: boolean }) {
  return open
    ? <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
    : <svg className="h-4 w-4 text-gray-500 dark:text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
