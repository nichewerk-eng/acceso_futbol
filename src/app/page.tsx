import type { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import HomeView from '@/components/HomeView';
import type { Fixture } from '@/components/standings/types';

export const metadata: Metadata = {
  title: 'México en el Mundial 2026 | Acceso Futbol',
  description: 'Sigue el camino de la Selección Mexicana en el FIFA World Cup 2026. Resultados, calendario y próximo partido en tiempo real.',
  openGraph: {
    title: 'México en el Mundial 2026 | Acceso Futbol',
    description: 'Resultados, próximo partido y countdown en tiempo real.',
    images: [{ url: '/og-mundial.png', width: 1200, height: 630 }],
  },
};

export const revalidate = 30;

async function fetchWCFixtures(): Promise<Fixture[]> {
  try {
    const res = await fetch(
      'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260710&limit=200',
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return [];
    const raw = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw.events ?? []).map((event: any) => {
      const comp        = event.competitions?.[0];
      const competitors = comp?.competitors ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];
      return {
        id: event.id, date: event.date,
        status: { state: event.status?.type?.state ?? 'pre', shortDetail: event.status?.type?.shortDetail ?? '', completed: event.status?.type?.completed ?? false },
        home: { name: home?.team?.displayName ?? '', abbreviation: home?.team?.abbreviation ?? '', score: home?.score ?? null },
        away: { name: away?.team?.displayName ?? '', abbreviation: away?.team?.abbreviation ?? '', score: away?.score ?? null },
      };
    });
  } catch { return []; }
}

export default async function HomePage() {
  const fixtures = await fetchWCFixtures();
  return (
    <>
      <SiteNav />
      <HomeView fixtures={fixtures} />
    </>
  );
}
