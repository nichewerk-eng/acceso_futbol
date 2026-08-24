import type { Metadata } from 'next';
import Link from 'next/link';
import { HorariosCalendar } from '@/components/horarios/HorariosCalendar';
import { PulseNav } from '@/components/living-room/PulseNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { siteConfig } from '@/config/site';
import { horariosFaq } from '@/lib/horariosCopy';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  sportsEventItemListJsonLd,
  webPageJsonLd,
} from '@/lib/seo';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { focusHorarioRounds, groupHorarioRounds } from '@/lib/sports/horariosBoard';
import { getJornadaOverview } from '@/lib/sports/jornada';

export const revalidate = 60;

const TITLE = 'Horarios Liga MX Apertura 2026 · Calendario CDMX';
const DESCRIPTION =
  'Horarios oficiales de la Liga MX Apertura 2026 en Acceso Futbol: calendario jornada por jornada, hora del centro de México (CDMX) y canales en México y Estados Unidos.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    'Liga MX horarios',
    'horarios Liga MX',
    'calendario Liga MX',
    'Liga MX horarios Acceso Futbol',
    'Apertura 2026 horarios',
    'jornada Liga MX',
  ],
  alternates: { canonical: absoluteUrl('/horarios') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/horarios'),
    type: 'website',
    siteName: siteConfig.name,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default async function HorariosPage() {
  const [{ fixtures }, jornada] = await Promise.all([
    fetchLigaMxFixtures(),
    getJornadaOverview().catch(() => null),
  ]);
  const rounds = groupHorarioRounds(fixtures);
  const focus = focusHorarioRounds(rounds, jornada?.number ?? null);
  const faq = horariosFaq(focus, jornada?.label ?? 'la jornada');
  const schemaFixtures = focus.flatMap((r) => r.fixtures);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Horarios Liga MX', path: '/horarios' },
          ]),
          webPageJsonLd({
            name: 'Horarios Liga MX Apertura 2026',
            path: '/horarios',
            description: DESCRIPTION,
            speakableSelectors: ['h1', '.af-horarios-lead'],
          }),
          ...(schemaFixtures.length
            ? [
                sportsEventItemListJsonLd(schemaFixtures, {
                  name: `Horarios Liga MX · ${jornada?.label ?? 'Apertura 2026'}`,
                }),
              ]
            : []),
          ...(faq.length ? [faqPageJsonLd(faq)] : []),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://HORARIOS
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-wide sm:text-5xl">
          Horarios Liga MX
        </h1>
        <p className="af-horarios-lead mt-5 max-w-xl text-[17px] leading-8 text-muted">
          Calendario del Apertura 2026, jornada por jornada, en la hora de tu dispositivo. Las
          puertas suelen abrir unas dos horas antes; aquí va la hora de inicio.
        </p>
        <p className="mt-3 max-w-2xl font-mono text-[12px] leading-6 text-muted">
          {jornada ? `${jornada.label} en curso.` : 'Apertura 2026.'}{' '}
          <Link href="/donde-ver" className="text-signal hover:text-foreground">
            Dónde ver
          </Link>
          {' · '}
          <Link href="/liga-mx" className="text-signal hover:text-foreground">
            Resultados y tabla
          </Link>
        </p>

        <HorariosCalendar focus={focus} rounds={rounds} />

        {faq.length ? (
          <section className="dv-faq mt-12" aria-label="Preguntas frecuentes">
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
