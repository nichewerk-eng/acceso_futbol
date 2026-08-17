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
              width={48}
              height={48}
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
              ACCESO <span className="af-footer-wordmark-sub">FUTBOL</span>
            </p>
            <p className="af-footer-tagline">{siteConfig.tagline}</p>
          </div>
        </div>

        <div className="af-footer-nav">
          <nav className="af-footer-col" aria-label="Aire">
            <p className="af-tele">Aire</p>
            <ul>
              <li>
                <Link href="/liga-mx" data-testid="footer-liga-mx">
                  Liga MX
                </Link>
              </li>
              <li>
                <Link href="/leagues-cup" data-testid="footer-leagues-cup">
                  Leagues Cup
                </Link>
              </li>
              <li>
                <Link href="/nosotros" data-testid="footer-nosotros">
                  Quiénes somos
                </Link>
              </li>
              <li>
                <Link href="/contacto" data-testid="footer-contacto">
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/mediakit" data-testid="footer-mediakit">
                  Media kit
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="af-footer-col" aria-label="Cabina">
            <p className="af-tele">Cabina</p>
            <ul>
              <li>
                <a href={`mailto:${siteConfig.email}`} data-testid="footer-email">
                  {siteConfig.email}
                </a>
              </li>
              {SOCIAL_CHANNELS.map((ch) => (
                <li key={ch.id}>
                  <a
                    href={ch.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`footer-social-${ch.id}`}
                  >
                    {ch.label} {ch.handle}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="af-footer-legal">
          <p className="af-tele">
            {siteConfig.name} · MX ↔ US · © {year}
          </p>
          <p className="af-tele af-footer-legal-dim">Ritual de jornada · no wire service</p>
        </div>
      </div>
    </footer>
  );
}
