import type { Metadata } from 'next';
import { PulseNav } from '@/components/living-room/PulseNav';
import { ClubsNav } from '@/components/club/ClubsNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { LIGA_MX_CLUBS } from '@/config/clubs';
import { absoluteUrl, breadcrumbJsonLd, webPageJsonLd } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Clubes Liga MX · salas Acceso',
  description:
    'Salas de cada club de Liga MX: partidos, noticias, dónde ver y cobertura de Acceso Futbol.',
  alternates: { canonical: absoluteUrl('/club') },
  openGraph: {
    title: 'Clubes Liga MX · salas Acceso',
    description:
      'Entra a la sala de América, Chivas, Cruz Azul, Tigres y el resto de Liga MX.',
    url: absoluteUrl('/club'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clubes Liga MX · salas Acceso',
    description: 'Partidos, pulso y cobertura de cada club de Liga MX.',
  },
};

export default function ClubesPage() {
  const clubs = LIGA_MX_CLUBS;

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Clubes', path: '/club' },
          ]),
          webPageJsonLd({
            name: 'Clubes Liga MX',
            path: '/club',
            description:
              'Salas de cada club de Liga MX: partidos, noticias y cobertura Acceso.',
            speakableSelectors: ['h1'],
          }),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Clubes Liga MX — Acceso Futbol',
            itemListElement: clubs.map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.name,
              url: absoluteUrl(`/club/${c.id}`),
            })),
          },
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="sr-only">Clubes Liga MX</h1>
        <ClubsNav />
      </main>
      <SiteFooter />
    </div>
  );
}
