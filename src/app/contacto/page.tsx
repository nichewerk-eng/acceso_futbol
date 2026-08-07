import type { Metadata } from 'next';
import Link from 'next/link';
import { PulseNav } from '@/components/living-room/PulseNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/config/site';
import { absoluteUrl, breadcrumbJsonLd, organizationJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contacto',
  description: `Contacta a Acceso Futbol: ${siteConfig.email}. Prensa, marcas y cabina — fútbol mexicano MX ↔ US.`,
  alternates: { canonical: absoluteUrl('/contacto') },
  openGraph: {
    title: 'Contacto · Acceso Futbol',
    description: `Escríbenos a ${siteConfig.email}. Media kit y redes en la misma cabina.`,
    url: absoluteUrl('/contacto'),
    type: 'website',
  },
};

export default function ContactoPage() {
  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Contacto', path: '/contacto' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            name: 'Contacto · Acceso Futbol',
            url: absoluteUrl('/contacto'),
            mainEntity: {
              '@type': 'Organization',
              name: siteConfig.name,
              email: siteConfig.email,
              url: siteConfig.url,
            },
          },
        ]}
      />
      <PulseNav />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-signal">
          Cabina
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-wide sm:text-5xl">
          Contacto
        </h1>
        <p className="mt-6 text-[17px] leading-8 text-muted">
          Prensa, marcas, colaboraciones o feedback del show — escríbenos. Respondemos
          desde la misma cabina que produce el pulso diario.
        </p>

        <div className="mt-10 space-y-6">
          <a
            href={`mailto:${siteConfig.email}`}
            className="block border border-white/[0.1] px-5 py-4 transition hover:border-signal/50"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Email
            </span>
            <span className="mt-1 block font-mono text-lg text-signal">
              {siteConfig.email}
            </span>
          </a>

          <div className="border border-white/[0.1] px-5 py-4">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Redes
            </span>
            <ul className="mt-3 space-y-2 font-mono text-sm">
              <li>
                <a
                  href={siteConfig.social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal hover:text-foreground"
                >
                  TikTok @{siteConfig.tiktok.username}
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal hover:text-foreground"
                >
                  Instagram @accesofutbolmx
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal hover:text-foreground"
                >
                  YouTube Acceso Futbol
                </a>
              </li>
            </ul>
          </div>

          <p className="text-[16px] leading-7 text-muted">
            Dossier para marcas:{' '}
            <Link href="/mediakit" className="text-signal hover:text-foreground">
              Media kit →
            </Link>
          </p>
          <p className="text-[16px] leading-7 text-muted">
            <Link href="/nosotros" className="text-signal hover:text-foreground">
              Quiénes somos →
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
