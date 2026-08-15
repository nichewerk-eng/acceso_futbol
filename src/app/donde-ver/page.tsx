import type { Metadata } from 'next';
import { PulseNav } from '@/components/living-room/PulseNav';
import { DondeVerRoom } from '@/components/living-room/DondeVerRoom';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Dónde ver Liga MX · MX y US',
  description:
    'Guía de transmisión Liga MX: canales en México y Estados Unidos por partido, jornada en curso.',
  alternates: { canonical: absoluteUrl('/donde-ver') },
  openGraph: {
    title: 'Dónde ver Liga MX · MX ↔ US',
    description: 'Cada partido de la jornada, con marcas MX y US. Acceso Futbol.',
    url: absoluteUrl('/donde-ver'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dónde ver Liga MX · MX ↔ US',
    description: 'Cada partido de la jornada, con marcas MX y US.',
  },
};

export default function DondeVerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: 'Dónde ver', path: '/donde-ver' },
        ])}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <DondeVerRoom />
      </main>
      <SiteFooter />
    </div>
  );
}
