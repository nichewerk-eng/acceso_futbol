import type { Metadata } from 'next';
import { PulseNav } from '@/components/living-room/PulseNav';
import { OnceRoom } from '@/components/living-room/OnceRoom';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd, webPageJsonLd } from '@/lib/seo';
import { getTotwBoard } from '@/lib/sports/totw';

export const revalidate = 120;

export const metadata: Metadata = {
  title: 'Once de la jornada · Liga MX',
  description:
    'El XI Acceso de cada jornada de Liga MX: rating Sportmonks más el resultado del equipo.',
  alternates: { canonical: absoluteUrl('/once') },
  openGraph: {
    title: 'Once de la jornada · Liga MX',
    description: 'El XI de la fecha y las figuras, al sello de cada jornada.',
    url: absoluteUrl('/once'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Once de la jornada · Liga MX',
    description: 'El XI de la fecha y las figuras, al sello de cada jornada.',
  },
};

export default async function OncePage() {
  const initial = await getTotwBoard().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Once', path: '/once' },
          ]),
          webPageJsonLd({
            name: 'Once de la jornada Liga MX',
            path: '/once',
            description:
              'El XI Acceso de cada jornada de Liga MX: rating Sportmonks más el resultado del equipo.',
            speakableSelectors: ['h1'],
          }),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <OnceRoom asPage initial={initial} />
      </main>
      <SiteFooter />
    </div>
  );
}
