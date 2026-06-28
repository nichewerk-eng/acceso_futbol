import { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import HeroBanner from '@/components/HeroBanner';
import SeleccionView from '@/components/seleccion/SeleccionView';
import type { Fixture } from '@/components/standings/types';

export const metadata: Metadata = {
  title: 'Selección Mexicana | El Tri en el Mundial 2026',
  description: 'Sigue a la Selección Mexicana en el Mundial 2026. Resultados, próximos partidos y el tracker de El Quinto Partido.',
  openGraph: {
    title: 'El Tri en el Mundial 2026 | Acceso Futbol',
    description: 'Resultados, calendario y el tracker de El Quinto Partido.',
    images: [{ url: '/og-seleccion.png', width: 1200, height: 630 }],
  },
};

export const revalidate = 30;

async function fetchFixtures(): Promise<Fixture[]> {
  try {
    const res = await fetch(
      'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260710&limit=200',
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return [];
    const raw = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw.events ?? []).map((event: any) => {
      const comp = event.competitions?.[0];
      const competitors = comp?.competitors ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const home = competitors.find((c: any) => c.homeAway === 'home') ?? competitors[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const away = competitors.find((c: any) => c.homeAway === 'away') ?? competitors[1];
      return {
        id: event.id, date: event.date,
        status: { completed: event.status?.type?.completed ?? false, state: event.status?.type?.state ?? 'pre', description: event.status?.type?.description ?? '', shortDetail: event.status?.type?.shortDetail ?? '' },
        venue: comp?.venue?.fullName ?? null, city: comp?.venue?.address?.city ?? null,
        home: { name: home?.team?.displayName ?? '', abbreviation: home?.team?.abbreviation ?? '', score: home?.score ?? null },
        away: { name: away?.team?.displayName ?? '', abbreviation: away?.team?.abbreviation ?? '', score: away?.score ?? null },
      };
    });
  } catch { return []; }
}

export default async function SeleccionPage() {
  const fixtures = await fetchFixtures();
  return (
    <>
      <SiteNav />
      <HeroBanner />
      <SeleccionView fixtures={fixtures} />
    </>
  );
}
