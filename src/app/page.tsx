import type { Metadata } from 'next';
import { PulseHome } from '@/components/living-room/PulseHome';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/config/site';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Acceso Futbol | Donde vive el fútbol mexicano',
  },
  description:
    'Pulso en vivo de Liga MX, Leagues Cup y El Tri: marcadores, cabina Acceso Radio, jornada y cable en español para México y EE.UU.',
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: 'Acceso Futbol | Donde vive el fútbol mexicano',
    description:
      'Marcadores, crónica y cable de Liga MX y Leagues Cup. El fútbol mexicano en tu sala.',
    url: siteConfig.url,
    type: 'website',
    siteName: siteConfig.name,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acceso Futbol | Donde vive el fútbol mexicano',
    description:
      'Marcadores, crónica y cable de Liga MX y Leagues Cup. El fútbol mexicano en tu sala.',
  },
};

export default function RootPage() {
  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <PulseHome />
    </>
  );
}
