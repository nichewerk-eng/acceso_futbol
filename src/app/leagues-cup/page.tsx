import { Metadata } from 'next';
import { SiteFooter } from '@/components/home/SiteFooter';
import LeaguesCupView from '@/components/leaguescup/LeaguesCupView';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import { attachDondeVer } from '@/config/dondeVer';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import {
  fetchLeaguesCupSeasonFixtures,
  involvesLigaMxClub,
  sportmonksEnabled,
} from '@/lib/sports';
import type { Fixture } from '@/lib/sports/types';

export const metadata: Metadata = {
  title: 'Leagues Cup 2026 · MLS × Liga MX calendario y dónde ver',
  description:
    'Calendario Leagues Cup 2026 con clubes de Liga MX: horarios, resultados, Apple TV / TV selecta y cabina Acceso Futbol.',
  alternates: { canonical: absoluteUrl('/leagues-cup') },
  openGraph: {
    title: 'Leagues Cup 2026 · MLS × Liga MX',
    description: 'Fase 1, eliminación, dónde ver y fichas con clubes mexicanos.',
    url: absoluteUrl('/leagues-cup'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leagues Cup 2026 · MLS × Liga MX',
    description: 'Fase 1, eliminación, dónde ver y fichas con clubes mexicanos.',
  },
};

export const revalidate = 60;

async function loadFixtures(): Promise<Fixture[]> {
  if (!sportmonksEnabled()) return [];
  try {
    const raw = await fetchLeaguesCupSeasonFixtures();
    return raw
      .filter((f) => involvesLigaMxClub(f.home, f.away))
      .map(attachDondeVer)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  } catch {
    return [];
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
