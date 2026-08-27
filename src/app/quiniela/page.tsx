import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/home/SiteFooter';
import { PulseNav } from '@/components/living-room/PulseNav';
import { QuinielaBoard } from '@/components/quiniela/QuinielaBoard';
import { JsonLd } from '@/components/seo/JsonLd';
import { getLeaderboard, getQuinielaBoard } from '@/lib/quiniela/service';
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
      'Para jugar no. Con un nombre alcanza en este teléfono. Para ver tu racha en otro dispositivo, deja el mismo correo y te mandamos un enlace.',
  },
  {
    question: '¿Hay dos tablas?',
    answer:
      'La tabla de esta jornada es solo esos partidos. La del Apertura suma todas las jornadas y se actualiza cuando cierra cada una. La de la jornada se queda un día después del último partido.',
  },
];

export default async function QuinielaPage() {
  const board = await getQuinielaBoard().catch(() => null);
  const leaderboard = board ? await getLeaderboard(board).catch(() => null) : null;

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
        <div className="q-page-head">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
            La Quiniela
          </h1>
          {board ? <span className="q-jornada-chip">{board.jornadaLabel}</span> : null}
        </div>
        <p className="q-page-lead">
          Toca al ganador o Empate. Un punto por acierto. Guarda antes del silbatazo.
        </p>

        <QuinielaBoard initial={board} initialLeaderboard={leaderboard} />

        <section className="q-faq">
          <h2>Cómo se juega</h2>
          <dl>
            {FAQ.map((f) => (
              <div key={f.question}>
                <dt>{f.question}</dt>
                <dd>{f.answer}</dd>
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
