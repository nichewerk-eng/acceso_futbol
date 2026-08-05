import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter } from '@/components/home/SiteFooter';
import { ClubSala } from '@/components/club/ClubSala';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { allClubIdentities, getClubIdentity } from '@/config/clubIdentity';
import { getClubBoard } from '@/lib/sports/clubBoard';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return allClubIdentities().map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const club = getClubIdentity(slug);
  if (!club) return { title: 'Club' };
  const title = `${club.name} · Sala Acceso`;
  const description = `${club.weatherLine} Partidos, dónde ver, cable, Reddit y el show de Acceso — la sala de ${club.name}.`;
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

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: board.club.name, path: `/club/${board.club.id}` },
        ])}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <ClubSala initialBoard={board} />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
