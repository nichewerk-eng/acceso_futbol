import type { Metadata } from 'next';
import { PulseNav } from '@/components/living-room/PulseNav';
import { TomaRoom } from '@/components/living-room/TomaRoom';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Toma de la jornada · Acceso Futbol',
  description:
    'La toma Acceso de la jornada Liga MX: lo que importó, no la tabla. MX ↔ US.',
  alternates: { canonical: absoluteUrl('/toma') },
  openGraph: {
    title: 'Toma de la jornada · Acceso Futbol',
    description: 'Lo que importó en la fecha. Acceso Futbol.',
    url: absoluteUrl('/toma'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toma de la jornada · Acceso Futbol',
    description: 'Lo que importó en la fecha.',
  },
};

export default function TomaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: 'Toma', path: '/toma' },
        ])}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <TomaRoom />
      </main>
      <SiteFooter />
    </div>
  );
}
