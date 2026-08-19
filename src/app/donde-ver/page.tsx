import type { Metadata } from 'next';
import { PulseNav } from '@/components/living-room/PulseNav';
import { DondeVerRoom } from '@/components/living-room/DondeVerRoom';
import { DondeVerTeamsNav } from '@/components/living-room/DondeVerTeamsNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, webPageJsonLd } from '@/lib/seo';
import { jornadaDondeVerFaq } from '@/lib/dondeVerCopy';
import { getJornadaOverview } from '@/lib/sports/jornada';

// Guide changes slowly; live scores hydrate + poll on the client after first paint.
export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Dónde ver Liga MX hoy · Canales MX y US',
  description:
    'Guía de transmisión de la Liga MX: en qué canal y a qué hora ver cada partido de la jornada en México (TUDN, ViX, Canal 5, Azteca 7, FOX) y Estados Unidos (TUDN, Univision, ViX).',
  alternates: { canonical: absoluteUrl('/donde-ver') },
  openGraph: {
    title: 'Dónde ver Liga MX · MX ↔ US',
    description: 'Cada partido de la jornada, con canal en México y Estados Unidos. Acceso Futbol.',
    url: absoluteUrl('/donde-ver'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dónde ver Liga MX · MX ↔ US',
    description: 'Cada partido de la jornada, con canal en México y Estados Unidos.',
  },
};

export default async function DondeVerPage() {
  const initial = await getJornadaOverview().catch(() => null);
  const faq = jornadaDondeVerFaq(initial);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Dónde ver', path: '/donde-ver' },
          ]),
          webPageJsonLd({
            name: 'Dónde ver Liga MX hoy',
            path: '/donde-ver',
            description:
              'En qué canal y a qué hora ver cada partido de la Liga MX en México y Estados Unidos.',
            speakableSelectors: ['h1', '.dv-guide-head'],
          }),
          ...(faq.length ? [faqPageJsonLd(faq)] : []),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <DondeVerRoom initial={initial} />

        <div className="dv-page-lower">
          <DondeVerTeamsNav />

          {faq.length ? (
            <section className="dv-faq" aria-label="Preguntas frecuentes">
              <p className="af-tele text-foreground">
                <span className="text-signal">AF</span>
                ://FAQ
              </p>
              <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wide">
                Preguntas frecuentes
              </h2>
              <dl className="dv-faq-list">
                {faq.map((item) => (
                  <div key={item.question} className="dv-faq-item">
                    <dt>{item.question}</dt>
                    <dd>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
