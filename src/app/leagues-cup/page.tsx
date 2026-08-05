import { Metadata } from 'next';
import { SiteFooter } from '@/components/home/SiteFooter';
import LeaguesCupView from '@/components/leaguescup/LeaguesCupView';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import { buildLeaguesCupBoard, fetchLeaguesCupLiveBoard } from '@/lib/sports';
import type { Fixture } from '@/lib/sports/types';

export const metadata: Metadata = {
  title: 'Leagues Cup 2026 · MLS × Liga MX calendario, tabla y dónde ver',
  description:
    'Calendario y tabla oficial Leagues Cup 2026: Fase 1, posiciones Liga MX y MLS, eliminación, estadios y Apple TV.',
  alternates: { canonical: absoluteUrl('/leagues-cup') },
  openGraph: {
    title: 'Leagues Cup 2026 · MLS × Liga MX',
    description: 'Partidos, tabla Fase 1, sedes oficiales y dónde ver.',
    url: absoluteUrl('/leagues-cup'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leagues Cup 2026 · MLS × Liga MX',
    description: 'Partidos, tabla Fase 1, sedes oficiales y dónde ver.',
  },
};

export const revalidate = 60;

async function loadFixtures(): Promise<Fixture[]> {
  try {
    const { fixtures } = await fetchLeaguesCupLiveBoard();
    return fixtures;
  } catch {
    return buildLeaguesCupBoard([]);
  }
}

export default async function LeaguesCupPage() {
  const fixtures = await loadFixtures();
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pulso', path: '/' },
          { name: 'Leagues Cup', path: '/leagues-cup' },
        ])}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <LeaguesCupView initialFixtures={fixtures} />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
