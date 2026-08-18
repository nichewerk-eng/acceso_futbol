import { Metadata } from 'next';
import { SiteFooter } from '@/components/home/SiteFooter';
import LigaMXView from '@/components/ligamx/LigaMXView';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import type { LigaMXTable } from '@/app/api/ligamx/standings/route';
import { absoluteUrl, breadcrumbJsonLd, personItemListJsonLd } from '@/lib/seo';
import { fetchLigaMxFemenilFixtures, fetchLigaMxFemenilLeaders } from '@/lib/sports/ligaMxFemenilBoard';
import { fixtureToLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';
import { fetchLigaMxFemenilStandings, sportmonksEnabled } from '@/lib/sports/sportmonks';

export const metadata: Metadata = {
  title: 'Liga MX Femenil Apertura 2026 · Jornada, tabla y goleo',
  description:
    'Jornada en vivo, tabla de posiciones y goleo de la Liga MX Femenil Apertura 2026. Resultados y Liguilla, al día.',
  alternates: { canonical: absoluteUrl('/liga-mx-femenil') },
  openGraph: {
    title: 'Liga MX Femenil Apertura 2026 · Jornada, tabla y goleo',
    description: 'Posiciones, resultados, goleo y camino a Liguilla en tiempo real.',
    url: absoluteUrl('/liga-mx-femenil'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liga MX Femenil Apertura 2026 · Jornada, tabla y goleo',
    description: 'Posiciones, resultados, goleo y camino a Liguilla en tiempo real.',
  },
};

export const revalidate = 10;

async function fetchTable(): Promise<LigaMXTable | null> {
  if (!sportmonksEnabled()) return null;
  try {
    const sm = await fetchLigaMxFemenilStandings();
    return { ...sm, source: 'sportmonks' };
  } catch {
    return null;
  }
}

async function fetchFixtures() {
  try {
    const { fixtures } = await fetchLigaMxFemenilFixtures();
    return fixtures.map(fixtureToLigaMxSchedule);
  } catch {
    return [];
  }
}

type LigaMxTab = 'jornada' | 'tabla' | 'goleo';

function parseTab(raw?: string): LigaMxTab {
  if (raw === 'tabla' || raw === 'goleo') return raw;
  return 'jornada';
}

export default async function LigaMxFemenilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const [table, fixtures, goleo] = await Promise.all([
    fetchTable(),
    fetchFixtures(),
    fetchLigaMxFemenilLeaders().catch(() => null),
  ]);
  const season = goleo?.seasonLabel ?? table?.season ?? 'Apertura 2026';
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Liga MX Femenil', path: '/liga-mx-femenil' },
          ]),
          ...(goleo?.goals.length
            ? [
                personItemListJsonLd(
                  goleo.goals.map((g) => ({
                    name: g.name,
                    teamName: g.teamName,
                    position: g.position,
                  })),
                  { name: `Goleo Liga MX Femenil — ${season}` }
                ),
              ]
            : []),
        ]}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <LigaMXView
            league="liga-mx-femenil"
            initialTable={table}
            initialFixtures={fixtures}
            initialGoleo={goleo}
            initialTab={parseTab(params.tab)}
          />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
