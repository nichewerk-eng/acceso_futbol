import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/home/SiteFooter';
import { ClubSala } from '@/components/club/ClubSala';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { allClubIdentities, getClubIdentity } from '@/config/clubIdentity';
import { getClubBoard } from '@/lib/sports/clubBoard';
import { absoluteUrl, breadcrumbJsonLd, sportsTeamJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allClubIdentities().map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const club = getClubIdentity(slug);
  if (!club) return { title: 'Club' };
  const title = `${club.name} · noticias, partidos y sala Acceso`;
  const description = `${club.name} (${club.abbreviation}): partidos, dónde ver, cable y show de Acceso Futbol. ${club.weatherLine}`;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/club/${club.id}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/club/${club.id}`),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export const revalidate = 60;

export default async function ClubPage({ params }: Props) {
  const { slug } = await params;
  const board = await getClubBoard(slug);
  if (!board) notFound();

  const club = board.club;

  return (
    <>
      <JsonLd
        data={[
          sportsTeamJsonLd(club),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: club.name, path: `/club/${club.id}` },
          ]),
        ]}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <section className="sr-only" aria-label={club.name}>
            <h1>{club.name}</h1>
            <p>
              {club.name} ({club.abbreviation}) en Acceso Futbol — partidos, cable y cobertura
              de Liga MX. {club.weatherLine}
            </p>
            <nav>
              <Link href="/liga-mx">Liga MX</Link>
              <Link href="/tabla">Tabla</Link>
              <Link href="/">Pulso</Link>
            </nav>
          </section>
          <ClubSala initialBoard={board} />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
