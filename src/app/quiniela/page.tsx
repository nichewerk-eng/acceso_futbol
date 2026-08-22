import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/home/SiteFooter';
import { PulseNav } from '@/components/living-room/PulseNav';
import { QuinielaBoard } from '@/components/quiniela/QuinielaBoard';
import { JsonLd } from '@/components/seo/JsonLd';
import { getQuinielaBoard } from '@/lib/quiniela/service';
import { absoluteUrl, breadcrumbJsonLd, faqPageJsonLd, webPageJsonLd } from '@/lib/seo';

export const revalidate = 30;

const TITLE = 'La Quiniela Liga MX · elige al ganador o empate';
const DESCRIPTION =
  'Llena tu quiniela de la Liga MX jornada por jornada: toca el equipo que gana o Empate en cada partido, suma aciertos y compite en la tabla de quinieleros. Gratis y sin registro.';

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
    question: '¿Cómo se juega?',
    answer:
      'Toca el escudo del equipo que crees que gana, o Empate, en cada partido de la jornada. Tienes que llenar toda la carta para guardar. Cuando el partido termina, si tu elección coincide con el marcador sumas un punto.',
  },
  {
    question: '¿Hasta cuándo puedo cambiar?',
    answer:
      'Hasta el silbatazo inicial de ese partido. Los que ya empezaron o ya acabaron quedan bloqueados. Si no elegiste a tiempo, ese partido no cuenta para ti.',
  },
  {
    question: '¿Necesito una cuenta?',
    answer:
      'No. Escribe un nombre (no Anónimo) para aparecer en la tabla. Tus elecciones se guardan en este teléfono o computadora.',
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
        {board ? (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {board.jornadaLabel}
          </p>
        ) : null}
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
          En cada partido toca el equipo que crees que gana, o Empate. Si atinas, sumas un punto.
          Llena <em>todos</em> los partidos que aún no arrancan y guarda <em>antes</em> del silbatazo:
          después ya no se puede cambiar. Gratis, sin cuenta.
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
          <Link href="/donde-ver" className="af-cta af-cta-ghost">
            Dónde ver la jornada
          </Link>
          <Link href="/liga-mx" className="af-cta af-cta-ghost">
            Liga MX
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
