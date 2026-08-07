import type { Metadata } from 'next';
import Link from 'next/link';
import { PulseHome } from '@/components/living-room/PulseHome';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/config/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
  },
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
    description: siteConfig.description,
    url: siteConfig.url,
    type: 'website',
    siteName: siteConfig.name,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
    description: siteConfig.description,
  },
};

export default function RootPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      {/* Crawlable SSR shell — PulseHome is client-hydrated */}
      <section className="sr-only" aria-label="Acceso Futbol">
        <h1>Acceso Futbol</h1>
        <p>{siteConfig.description}</p>
        <nav aria-label="Secciones principales">
          <Link href="/liga-mx">Liga MX — resultados, jornada y tabla</Link>
          <Link href="/leagues-cup">Leagues Cup — fixtures y standings</Link>
          <Link href="/tabla">Tabla de posiciones Liga MX</Link>
          <Link href="/nosotros">Quiénes somos</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
      </section>
      <PulseHome />
    </>
  );
}
