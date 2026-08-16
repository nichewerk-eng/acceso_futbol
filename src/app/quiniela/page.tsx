import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/home/SiteFooter';
import { PulseNav } from '@/components/living-room/PulseNav';
import { QuinielaBoard } from '@/components/quiniela/QuinielaBoard';
import { JsonLd } from '@/components/seo/JsonLd';
import { getQuinielaBoard } from '@/lib/quiniela/service';
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, webPageJsonLd } from '@/lib/seo';

export const revalidate = 30;

const TITLE = 'La Quiniela Liga MX · pronósticos 1-X-2';
const DESCRIPTION =
  'Llena tu quiniela de la Liga MX jornada por jornada: marca 1, X o 2 en cada partido, suma aciertos y compite en la tabla de quinieleros. Gratis y sin registro.';

export async function generateMetadata(): Promise<Metadata> {
  const board = await getQuinielaBoard().catch(() => null);
  const title = board ? `Quiniela Liga MX · ${board.jornadaLabel}` : TITLE;
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical: absoluteUrl('/quiniela') },
    openGraph: {
      title,
      description: DESCRIPTION,
      url: absoluteUrl('/quiniela'),
      type: 'website',
      locale: 'es_MX',
    },
    twitter: { card: 'summary_large_image', title, description: DESCRIPTION },
  };
}

const FAQ = [
  {
    question: '¿Cómo se juega la quiniela de la Liga MX?',
    answer:
      'Marca el resultado de cada partido de la jornada: 1 si gana el local, X si empatan y 2 si gana el visitante. Sumas un punto por cada acierto cuando el partido termina.',
  },
  {
    question: '¿Hasta cuándo puedo cambiar mis pronósticos?',
    answer:
      'Cada partido se cierra al momento del silbatazo inicial. Puedes ajustar tus picks de los partidos que aún no arrancan; los que ya empezaron quedan bloqueados.',
  },
  {
    question: '¿Necesito registrarme para jugar la quiniela?',
    answer:
      'No. La quiniela de Acceso Fútbol es gratis y anónima: eliges un alias y tus pronósticos se guardan en tu dispositivo para competir en la tabla de quinieleros.',
  },
];

export default async function QuinielaPage() {
  const board = await getQuinielaBoard().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Liga MX', path: '/liga-mx' },
            { name: 'Quiniela', path: '/quiniela' },
          ]),
          webPageJsonLd({
            name: board ? `Quiniela Liga MX · ${board.jornadaLabel}` : TITLE,
            path: '/quiniela',
            description: DESCRIPTION,
            speakableSelectors: ['h1'],
          }),
          faqPageJsonLd(FAQ),
        ]}
      />
      <PulseNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://QUINIELA
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
          La Quiniela
        </h1>
        <p className="mt-3 max-w-2xl font-mono text-[12px] leading-6 text-muted">
          Pronostica cada partido de la jornada — 1 local, X empate, 2 visita. Suma aciertos y sube
          en la tabla de quinieleros. Gratis, sin registro; cada partido se cierra al arranque.
        </p>

        <QuinielaBoard initial={board} />

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Cómo funciona</h2>
          <dl className="mt-4 space-y-4">
            {FAQ.map((f) => (
              <div key={f.question} className="border-l-2 border-line pl-4">
                <dt className="font-display text-base font-semibold">{f.question}</dt>
                <dd className="mt-1 font-mono text-[12px] leading-6 text-muted">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="mt-10 flex flex-wrap gap-2">
          <Link href="/donde-ver" className="af-cta-ghost">
            Dónde ver la jornada
          </Link>
          <Link href="/goleo" className="af-cta-ghost">
            Goleo Liga MX
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
