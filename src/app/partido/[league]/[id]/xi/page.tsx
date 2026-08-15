import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { XiPoster } from '@/components/partido/XiPoster';
import { absoluteUrl, leagueLabel } from '@/lib/seo';
import { getMatch, peekMatch } from '@/lib/sports/getMatch';

type PageParams = { params: Promise<{ league: string; id: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { league, id } = await params;
  const match = peekMatch(league, id) ?? (await getMatch(league, id).catch(() => null));
  const pair = match
    ? `${match.home.abbreviation} vs ${match.away.abbreviation}`
    : leagueLabel(league);
  const title = `XI · ${pair}`;
  const description = match
    ? `Alineación confirmada ${pair}${match.jornada ? ` · ${match.jornada}` : ''} · Acceso Futbol`
    : 'XI confirmado · Acceso Futbol';
  const path = `/partido/${league}/${id}/xi`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: 'website',
      locale: 'es_MX',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function XiPage({ params }: PageParams) {
  const { league, id } = await params;
  const match = peekMatch(league, id) ?? (await getMatch(league, id).catch(() => null));
  if (!match) notFound();
  return <XiPoster match={match} league={league} />;
}
