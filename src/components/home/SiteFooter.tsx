import Image from 'next/image';
import Link from 'next/link';
import { SOCIAL_CHANNELS, siteConfig } from '@/config/site';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="af-footer" data-testid="site-footer" aria-label="Cierre Acceso Futbol">
      <div className="af-footer-grain" aria-hidden />

      <div className="af-footer-inner">
        <div className="af-footer-mast">
          <Link href="/" className="af-footer-mark" data-testid="footer-logo" aria-label={siteConfig.name}>
            <Image
              src="/logo.png"
              alt=""
              width={160}
              height={160}
              className="af-footer-mark-img"
              priority={false}
            />
          </Link>
          <div className="af-footer-mast-copy">
            <p className="af-tele af-footer-path">
              <span className="text-signal">AF</span>
              ://CIERRE · FUNDADO {siteConfig.founded}
            </p>
            <p className="af-footer-wordmark" data-testid="footer-wordmark">
              ACCESO
              <span className="af-footer-wordmark-sub">FUTBOL</span>
            </p>
            <p className="af-footer-tagline">{siteConfig.tagline}</p>
          </div>
        </div>

        <nav className="af-footer-channels" aria-label="Canales Acceso">
          <Link href="/liga-mx" className="af-footer-channel" data-testid="footer-liga-mx">
            <span className="af-footer-channel-key">Liga MX</span>
            <span className="af-footer-channel-val">Jornada →</span>
          </Link>
          <Link href="/leagues-cup" className="af-footer-channel" data-testid="footer-leagues-cup">
            <span className="af-footer-channel-key">Leagues Cup</span>
            <span className="af-footer-channel-val">Board →</span>
          </Link>
          <Link href="/nosotros" className="af-footer-channel" data-testid="footer-nosotros">
            <span className="af-footer-channel-key">Casa</span>
            <span className="af-footer-channel-val">Quiénes somos →</span>
          </Link>
          <Link href="/contacto" className="af-footer-channel" data-testid="footer-contacto">
            <span className="af-footer-channel-key">Cabina</span>
            <span className="af-footer-channel-val">Contacto →</span>
          </Link>
          <a
            href={`mailto:${siteConfig.email}`}
            className="af-footer-channel"
            data-testid="footer-email"
          >
            <span className="af-footer-channel-key">Mail</span>
            <span className="af-footer-channel-val">{siteConfig.email}</span>
          </a>
          {SOCIAL_CHANNELS.map((ch) => (
            <a
              key={ch.id}
              href={ch.href}
              target="_blank"
              rel="noopener noreferrer"
              className="af-footer-channel"
              data-testid={`footer-social-${ch.id}`}
            >
              <span className="af-footer-channel-key">{ch.label}</span>
              <span className="af-footer-channel-val">{ch.handle}</span>
            </a>
          ))}
          <Link
            href="/mediakit"
            className="af-footer-channel"
            data-testid="footer-mediakit"
          >
            <span className="af-footer-channel-key">Dossier</span>
            <span className="af-footer-channel-val">Media kit →</span>
          </Link>
        </nav>

        <div className="af-footer-legal">
          <p className="af-tele">
            {siteConfig.name} · MX ↔ US · © {year}
          </p>
          <p className="af-tele af-footer-legal-dim">
            Ritual de jornada · no wire service
          </p>
        </div>
      </div>
    </footer>
  );
}
