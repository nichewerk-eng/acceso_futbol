import { Metadata } from 'next';
import { SiteFooter } from '@/components/home/SiteFooter';
import LigaMXView from '@/components/ligamx/LigaMXView';
import { PulseNav } from '@/components/living-room/PulseNav';
import { JsonLd } from '@/components/seo/JsonLd';
import type { LigaMXTable } from '@/app/api/ligamx/standings/route';
import { absoluteUrl, breadcrumbJsonLd, personItemListJsonLd } from '@/lib/seo';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { fetchLigaMxLeaders } from '@/lib/sports/leaders';
import { fixtureToLigaMxSchedule, mergeLigaMxSchedule } from '@/lib/sports/mergeLigaMxSchedule';

export const metadata: Metadata = {
  title: 'Liga MX Apertura 2026 · Jornada, tabla, goleo y once',
  description:
    'Jornada en vivo, tabla de posiciones, goleo y once de la fecha de la Liga MX Apertura 2026.',
  alternates: { canonical: absoluteUrl('/liga-mx') },
  openGraph: {
    title: 'Liga MX Apertura 2026 · Jornada, tabla, goleo y once',
    description: 'Posiciones, resultados, goleo, once de la fecha y camino a Liguilla.',
    url: absoluteUrl('/liga-mx'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Liga MX Apertura 2026 · Jornada, tabla, goleo y once',
    description: 'Posiciones, resultados, goleo, once de la fecha y camino a Liguilla.',
  },
};

export const revalidate = 10;

async function fetchTable(): Promise<LigaMXTable | null> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings',
      { next: { revalidate: 10 } },
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const entries = raw.standings?.entries ?? raw.children?.[0]?.standings?.entries ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = entries
      .map((entry: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sm = Object.fromEntries(entry.stats.map((s: any) => [s.abbreviation, s]));
        return {
          position: Number(sm['R']?.value ?? sm['POS']?.value ?? 0),
          team: {
            id: entry.team.id,
            name: entry.team.displayName,
            abbreviation: entry.team.abbreviation,
          },
          gp: Number(sm['GP']?.value ?? 0),
          w: Number(sm['W']?.value ?? 0),
          d: Number(sm['D']?.value ?? 0),
          l: Number(sm['L']?.value ?? 0),
          gf: Number(sm['F']?.value ?? sm['GF']?.value ?? 0),
          ga: Number(sm['A']?.value ?? sm['GA']?.value ?? 0),
          gd: sm['GD']?.displayValue ?? '0',
          pts: Number(sm['P']?.value ?? sm['PTS']?.value ?? 0),
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.position - b.position);
    return { season: raw.season?.displayName ?? 'Apertura 2026', entries: mapped };
  } catch {
    return null;
  }
}

async function fetchFixtures() {
  try {
    const { fixtures } = await fetchLigaMxFixtures();
    return mergeLigaMxSchedule(fixtures.map(fixtureToLigaMxSchedule));
  } catch {
    return mergeLigaMxSchedule([]);
  }
}

type LigaMxTab = 'jornada' | 'tabla' | 'goleo' | 'once';

function parseTab(raw?: string): LigaMxTab {
  if (raw === 'tabla' || raw === 'goleo' || raw === 'once') return raw;
  return 'jornada';
}

export default async function LigaMXPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const [table, fixtures, goleo] = await Promise.all([
    fetchTable(),
    fetchFixtures(),
    fetchLigaMxLeaders().catch(() => null),
  ]);
  const season = goleo?.seasonLabel ?? table?.season ?? 'Apertura 2026';
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Liga MX', path: '/liga-mx' },
          ]),
          ...(goleo?.goals.length
            ? [
                personItemListJsonLd(
                  goleo.goals.map((g) => ({
                    name: g.name,
                    teamName: g.teamName,
                    position: g.position,
                  })),
                  { name: `Goleo Liga MX — ${season}` }
                ),
              ]
            : []),
        ]}
      />
      <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
        <PulseNav />
        <main className="flex-1">
          <LigaMXView
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
