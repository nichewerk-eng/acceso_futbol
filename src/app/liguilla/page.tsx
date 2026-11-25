import type { Metadata } from 'next';
import { connection } from 'next/server';
import { PulseNav } from '@/components/living-room/PulseNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { LiguillaRoom } from '@/components/liguilla/LiguillaRoom';
import { JsonLd } from '@/components/seo/JsonLd';
import { liguillaFaq } from '@/lib/liguillaCopy';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  sportsEventItemListJsonLd,
  webPageJsonLd,
} from '@/lib/seo';
import { buildLiguillaBoard, liguillaFixtures } from '@/lib/sports/liguilla';
import { getLiguillaBoard, type LiguillaPayload } from '@/lib/sports/liguillaBoard';

/** Scores poll on the client; channels come from the Google Sheet overlay on every request. */
export const dynamic = 'force-dynamic';

const TITLE = 'Liguilla Liga MX Apertura 2026 · Cuartos, Semis y Final';
const DESCRIPTION =
  'Liguilla del Apertura 2026 en vivo: juegos de hoy, marcador global de cada serie, cuadro de cuartos, semifinales y final, horarios en tu zona y dónde ver cada partido en México y Estados Unidos.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'Liguilla Liga MX',
    'Liguilla Apertura 2026',
    'cuartos de final Liga MX',
    'semifinales Liga MX',
    'final Liga MX',
    'dónde ver Liguilla',
    'horarios Liguilla',
  ],
  alternates: { canonical: absoluteUrl('/liguilla') },
  openGraph: {
    title: TITLE,
    description: 'Juegos de hoy, marcador global, cuadro y canales de la Liguilla del Apertura 2026.',
    url: absoluteUrl('/liguilla'),
    type: 'website',
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: 'Juegos de hoy, marcador global, cuadro y canales de la Liguilla.',
  },
};

export default async function LiguillaPage() {
  await connection();
  const initial: LiguillaPayload =
    (await getLiguillaBoard().catch(() => null)) ?? { ...buildLiguillaBoard([]), source: 'static' };
  const faq = liguillaFaq(initial);
  const events = liguillaFixtures(initial).filter((f) => !f.home.placeholder && !f.away.placeholder);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Liga MX', path: '/liga-mx' },
            { name: 'Liguilla', path: '/liguilla' },
          ]),
          webPageJsonLd({
            name: 'Liguilla Liga MX Apertura 2026',
            path: '/liguilla',
            description: DESCRIPTION,
            speakableSelectors: ['h1', '.lq-lead'],
          }),
          ...(events.length
            ? [sportsEventItemListJsonLd(events, { name: 'Liguilla Liga MX Apertura 2026' })]
            : []),
          ...(faq.length ? [faqPageJsonLd(faq)] : []),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <LiguillaRoom initial={initial} />

        {faq.length ? (
          <section className="dv-faq mt-14" aria-label="Preguntas frecuentes">
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
      </main>
      <SiteFooter />
    </div>
  );
}
