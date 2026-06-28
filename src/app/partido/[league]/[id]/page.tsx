import { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import LiveTicker from '@/components/LiveTicker';
import MatchView from '@/components/partido/MatchView';

interface PageParams { params: Promise<{ league: string; id: string }> }

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { league, id } = await params;
  const leagueLabel = league === 'liga-mx' ? 'Liga MX' : 'Mundial 2026';
  return {
    title: `Partido ${id} | ${leagueLabel}`,
    description: `Marcador en vivo, estadísticas y alineaciones del partido de ${leagueLabel}.`,
  };
}

export default async function PartidoPage({ params }: PageParams) {
  const { league, id } = await params;
  return (
    <>
      <SiteNav />
      <LiveTicker />
      <MatchView league={league} id={id} />
    </>
  );
}
