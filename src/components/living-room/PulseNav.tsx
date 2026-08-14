'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/config/site';
import { useGravity } from '@/contexts/GravityContext';

const LINKS = [
  { href: '/', label: 'Pulso' },
  { href: '/#jornada', label: 'Jornada' },
  { href: '/#noticias', label: 'Cable' },
  { href: '/liga-mx', label: 'Liga MX' },
  { href: '/leagues-cup', label: 'Leagues Cup' },
];

export function PulseNav() {
  const pathname = usePathname();
  const { profileUrl, username } = siteConfig.tiktok;
  const { club, elTri, settled } = useGravity();
  const lock = [club?.abbreviation, elTri ? 'TRI' : null].filter(Boolean).join('+');

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
          {LINKS.map(({ href, label }) => {
            const active =
              href === '/'
                ? pathname === '/'
                : href.startsWith('/#')
                  ? false
                  : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                data-testid={`nav-link-${label.toLowerCase()}`}
                className={[
                  'px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition',
                  active ? 'text-foreground' : 'text-muted hover:text-foreground',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

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

        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="af-cta !px-3 !py-2"
          data-testid="nav-tiktok"
        >
          <span className="hidden sm:inline">@{username}</span>
          <span className="sm:hidden">Seguir</span>
        </a>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden scrollbar-none"
        data-testid="nav-mobile-strip"
      >
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            data-testid={`nav-mobile-${label.toLowerCase()}`}
            className="shrink-0 border border-line px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted"
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
