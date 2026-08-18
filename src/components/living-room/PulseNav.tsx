'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { GravityAlertsToggle } from '@/components/living-room/GravityAlertsToggle';
import { SeguirMenu } from '@/components/living-room/SeguirMenu';
import { useGravity } from '@/contexts/GravityContext';

const LINKS = [
  { href: '/', label: 'Pulso' },
  { href: '/donde-ver', label: 'Dónde ver' },
  { href: '/liga-mx', label: 'Liga MX' },
  { href: '/liga-mx-femenil', label: 'Femenil' },
  { href: '/quiniela', label: 'Quiniela' },
  { href: '/leagues-cup', label: 'Leagues Cup' },
];

function linkActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
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
      <div className="nav-pulse-bar">
        <div className="nav-pulse-start">
          <nav className="nav-pulse-links hidden md:flex" data-testid="nav-links">
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
          <SeguirMenu className="md:hidden" />
        </div>

        <Link
          href="/"
          className="nav-pulse-mark"
          aria-label="Acceso Futbol, inicio"
          data-testid="nav-logo"
        >
          <img
            src="/logo-dark.png"
            alt="Acceso Futbol"
            width={70}
            height={45}
            className="nav-pulse-mark-img"
            decoding="async"
          />
        </Link>

        <div className="nav-pulse-tools">
          <GravityAlertsToggle className="hidden md:inline" />

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

          <SeguirMenu className="hidden md:block" testId="nav-seguir-desktop" />

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
          <GravityAlertsToggle
            className="nav-drawer-link w-full text-left"
            testId="gravity-alerts-toggle-drawer"
          />
        </nav>
      ) : null}
    </header>
  );
}
