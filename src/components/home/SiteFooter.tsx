import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';

export function SiteFooter() {
  const year = new Date().getFullYear();
  const { username, profileUrl } = siteConfig.tiktok;

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
          <a
            href={`mailto:${siteConfig.email}`}
            className="af-footer-channel"
            data-testid="footer-email"
          >
            <span className="af-footer-channel-key">Cabina</span>
            <span className="af-footer-channel-val">{siteConfig.email}</span>
          </a>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="af-footer-channel"
            data-testid="footer-tiktok"
          >
            <span className="af-footer-channel-key">Megáfono</span>
            <span className="af-footer-channel-val">@{username}</span>
          </a>
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
