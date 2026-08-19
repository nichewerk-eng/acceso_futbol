import type { Metadata } from 'next';
import Link from 'next/link';
import { PulseHome } from '@/components/living-room/PulseHome';
import { JsonLd } from '@/components/seo/JsonLd';
import { LIGA_MX_CLUBS } from '@/config/clubs';
import { siteConfig } from '@/config/site';
import { fixtureChannelLabels, kickoffLabelMx } from '@/lib/dondeVerCopy';
import {
  organizationJsonLd,
  sportsEventItemListJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { liveStampLabel } from '@/lib/sports/liveStamp';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

// ISR: crawlable jornada board refreshes a couple times/min; live scores hydrate client-side.
export const revalidate = 30;

export const metadata: Metadata = {
  title: {
    absolute: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
  },
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    title: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
    description: siteConfig.description,
    url: siteConfig.url,
    type: 'website',
    siteName: siteConfig.name,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Acceso Futbol | Noticias, resultados y cobertura de Liga MX',
    description: siteConfig.description,
  },
};

function crawlLine(f: Fixture): string {
  const score =
    f.home.score != null && f.away.score != null
      ? `${f.home.score}-${f.away.score}`
      : 'vs';
  const status =
    f.state === 'in'
      ? liveStampLabel(f)
      : f.state === 'post'
        ? 'Final'
        : kickoffLabelMx(f.date);
  const { mx, us } = fixtureChannelLabels(f);
  const tv = [mx ? `MX: ${mx}` : '', us ? `US: ${us}` : ''].filter(Boolean).join(' · ');
  return `${f.home.name} ${score} ${f.away.name} — ${status}${tv ? ` — ${tv}` : ''}`;
}

/** Server-rendered, crawlable board of the active jornada. */
function HomeJornadaCrawl({ jornada }: { jornada: JornadaOverview }) {
  const all = [...jornada.live, ...jornada.played, ...jornada.upcoming];
  if (!all.length) return null;
  return (
    <section aria-label={`${jornada.label} — Liga MX`}>
      <h2>
        {jornada.label} — Liga MX · resultados, horarios y dónde ver
      </h2>
      <ul>
        {all.map((f) => (
          <li key={f.id}>
            <Link href={`/partido/liga-mx/${f.id}`}>{crawlLine(f)}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function RootPage() {
  const jornada = await getJornadaOverview().catch(() => null);
  const fixtures = jornada
    ? [...jornada.live, ...jornada.played, ...jornada.upcoming]
    : [];

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          ...(fixtures.length
            ? [
                sportsEventItemListJsonLd(fixtures, {
                  name: `${jornada?.label ?? 'Jornada'} — Liga MX`,
                }),
              ]
            : []),
        ]}
      />
      {/* Crawlable SSR shell — PulseHome is client-hydrated for the live experience. */}
      <section className="sr-only" aria-label="Acceso Futbol">
        <h1>Acceso Futbol</h1>
        <p>{siteConfig.description}</p>
        <nav aria-label="Secciones principales">
          <Link href="/liga-mx">Liga MX — resultados, jornada y tabla</Link>
          <Link href="/liga-mx-femenil">Liga MX Femenil</Link>
          <Link href="/donde-ver">Dónde ver la Liga MX hoy</Link>
          <Link href="/quiniela">Quiniela Liga MX</Link>
          <Link href="/leagues-cup">Leagues Cup — fixtures y standings</Link>
          <Link href="/once">Once de la jornada</Link>
          <Link href="/tabla">Tabla de posiciones Liga MX</Link>
          <Link href="/toma">Toma — el show del día</Link>
          <Link href="/nosotros">Quiénes somos</Link>
          <Link href="/contacto">Contacto</Link>
        </nav>
        <nav aria-label="Clubes Liga MX">
          <ul>
            {LIGA_MX_CLUBS.map((club) => (
              <li key={club.id}>
                <Link href={`/club/${club.id}`}>{club.name}</Link>
                {' — '}
                <Link href={`/donde-ver/${club.id}`}>Dónde ver {club.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {jornada ? <HomeJornadaCrawl jornada={jornada} /> : null}
      </section>
      <PulseHome />
    </>
  );
}
