import type { Metadata } from 'next';
import { MatchChapter } from '@/components/partido/MatchChapter';

interface PageParams {
  params: Promise<{ league: string; id: string }>;
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { league, id } = await params;
  const leagueLabel =
    league === 'liga-mx' ? 'Liga MX' : league === 'seleccion' ? 'El Tri' : 'Fútbol';
  return {
    title: `Partido · ${leagueLabel}`,
    description: `Capítulo en vivo, crónica y Acceso Radio. ${leagueLabel} (${id}).`,
  };
}

export default async function PartidoPage({ params }: PageParams) {
  const { league, id } = await params;
  return <MatchChapter league={league} id={id} />;
}
