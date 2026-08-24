import type { Metadata } from 'next';
import Link from 'next/link';
import { PulseNav } from '@/components/living-room/PulseNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/config/site';
import { absoluteUrl, breadcrumbJsonLd, organizationJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Quiénes somos',
  description:
    'Acceso Futbol es media de fútbol mexicano para México y Estados Unidos: Liga MX, Leagues Cup, El Tri, crónica y Acceso Radio.',
  alternates: { canonical: absoluteUrl('/nosotros') },
  openGraph: {
    title: 'Quiénes somos · Acceso Futbol',
    description:
      'Media binacional de fútbol mexicano. Resultados, narrativa y show — no wire service.',
    url: absoluteUrl('/nosotros'),
    type: 'website',
  },
};

export default function NosotrosPage() {
  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <JsonLd
        data={[
          organizationJsonLd(),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Quiénes somos', path: '/nosotros' },
          ]),
        ]}
      />
      <PulseNav />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-signal">
          Acceso Futbol · Fundado {siteConfig.founded}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-wide sm:text-5xl">
          Quiénes somos
        </h1>
        <p className="mt-6 text-[17px] leading-8 text-muted">
          {siteConfig.name} ({siteConfig.legalName}) es media de fútbol mexicano hecha
          para aficionados en México y Estados Unidos. Cubrimos Liga MX, Leagues Cup y
          la Selección Mexicana con marcadores, crónica, dónde ver y Acceso Radio —
          narrativa con urgencia, no cable de agencia.
        </p>
        <p className="mt-5 text-[17px] leading-8 text-muted">
          {siteConfig.tagline} Operamos desde el pulso diario del Apertura y la ventana
          hacia el Mundial 2026 en {siteConfig.worldCup.venue}.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold uppercase tracking-wide">
            Qué encontrarás aquí
          </h2>
          <ul className="mt-4 space-y-3 text-[16px] leading-7 text-muted">
            <li>
              <Link href="/horarios" className="text-signal hover:text-foreground">
                Horarios Liga MX
              </Link>
              {' — '}
              calendario oficial, hora CDMX y canales.
            </li>
            <li>
              <Link href="/liga-mx" className="text-signal hover:text-foreground">
                Liga MX
              </Link>
              {' — '}
              jornada, resultados y tabla en tiempo real.
            </li>
            <li>
              <Link href="/leagues-cup" className="text-signal hover:text-foreground">
                Leagues Cup
              </Link>
              {' — '}
              fixtures y standings con foco en clubs mexicanos.
            </li>
            <li>
              <Link href="/tabla" className="text-signal hover:text-foreground">
                Tabla
              </Link>
              {' — '}
              posiciones del torneo.
            </li>
            <li>
              Salas de club y momentos editoriales con take Acceso.
            </li>
          </ul>
        </section>

        <p className="mt-12 text-[16px] leading-7 text-muted">
          ¿Marcas o prensa?{' '}
          <Link href="/mediakit" className="text-signal hover:text-foreground">
            Media kit
          </Link>
          {' · '}
          <Link href="/contacto" className="text-signal hover:text-foreground">
            Contacto
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
