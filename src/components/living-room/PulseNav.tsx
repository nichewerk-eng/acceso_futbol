'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { GravityAlertsToggle } from '@/components/living-room/GravityAlertsToggle';
import { SeguirMenu } from '@/components/living-room/SeguirMenu';
import { useGravity } from '@/contexts/GravityContext';

const LINKS = [
  { href: '/', label: 'Pulso' },
  { href: '/#jornada', label: 'Jornada' },
  { href: '/#donde-ver', label: 'Dónde ver' },
  { href: '/#noticias', label: 'Cable' },
  { href: '/liga-mx', label: 'Liga MX' },
  { href: '/quiniela', label: 'Quiniela' },
  { href: '/leagues-cup', label: 'Leagues Cup' },
];

function linkActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href.startsWith('/#')) return false;
  return pathname.startsWith(href);
}

export function PulseNav() {
  const pathname = usePathname();
  const { club, elTri, settled } = useGravity();
  const lock = [club?.abbreviation, elTri ? 'TRI' : null].filter(Boolean).join('+');
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      data-testid="nav-pulse"
      className="sticky top-0 z-50 border-b border-line bg-bg-1/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="shrink-0"
          aria-label="Acceso Futbol, inicio"
          data-testid="nav-logo"
        >
          <Image
            src="/logo-dark.png"
            alt="Acceso Futbol"
            width={512}
            height={331}
            className="h-8 w-auto object-contain sm:h-9"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" data-testid="nav-links">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              data-testid={`nav-link-${label.toLowerCase()}`}
              className={[
                'px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition',
                linkActive(pathname, href) ? 'text-foreground' : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <GravityAlertsToggle />

        {settled && lock && (
          <Link
            href={club ? `/club/${club.id}` : elTri ? '/club/el-tri' : '/#gravedad'}
            className="af-chip hidden text-signal sm:inline-flex"
            title="Abrir sala del club"
            data-testid="nav-gravity-lock"
          >
            LOCK {lock}
          </Link>
        )}

        <SeguirMenu />

        <button
          type="button"
          className="nav-burger md:hidden"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          aria-controls={menuId}
          data-testid="nav-burger"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={open ? 'nav-burger-x' : undefined} aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id={menuId}
          className="nav-drawer md:hidden"
          data-testid="nav-drawer"
          aria-label="Secciones"
        >
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              data-testid={`nav-mobile-${label.toLowerCase()}`}
              className={[
                'nav-drawer-link',
                linkActive(pathname, href) ? 'nav-drawer-link-on' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
