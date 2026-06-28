import { Metadata } from 'next';
import SiteNav from '@/components/SiteNav';
import LiveTicker from '@/components/LiveTicker';
import LigaMXView from '@/components/ligamx/LigaMXView';
import type { LigaMXTable } from '@/app/api/ligamx/standings/route';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';

export const metadata: Metadata = {
  title: 'Liga MX | Tabla de Posiciones Apertura 2026',
  description: 'Tabla de posiciones, calendario y tracker de Liguilla de la Liga MX Apertura 2026 en tiempo real.',
  openGraph: {
    title: 'Liga MX Apertura 2026 | Acceso Futbol',
    description: 'Posiciones, resultados y clasificación a Liguilla en tiempo real.',
    images: [{ url: '/og-ligamx.png', width: 1200, height: 630 }],
  },
};

export const revalidate = 60;

async function fetchTable(): Promise<LigaMXTable | null> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/v2/sports/soccer/mex.1/standings',
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const raw = await res.json();
    const entries = raw.standings?.entries ?? raw.children?.[0]?.standings?.entries ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = entries.map((entry: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sm = Object.fromEntries(entry.stats.map((s: any) => [s.abbreviation, s]));
      return {
        position: Number(sm['R']?.value ?? sm['POS']?.value ?? 0),
        team: { id: entry.team.id, name: entry.team.displayName, abbreviation: entry.team.abbreviation },
        gp: Number(sm['GP']?.value ?? 0), w: Number(sm['W']?.value ?? 0),
        d: Number(sm['D']?.value ?? 0),   l: Number(sm['L']?.value ?? 0),
        gf: Number(sm['F']?.value ?? sm['GF']?.value ?? 0),
        ga: Number(sm['A']?.value ?? sm['GA']?.value ?? 0),
        gd: sm['GD']?.displayValue ?? '0', pts: Number(sm['P']?.value ?? sm['PTS']?.value ?? 0),
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).sort((a: any, b: any) => a.position - b.position);
    return { season: raw.season?.displayName ?? 'Apertura 2026', entries: mapped };
  } catch { return null; }
}

async function fetchFixtures(): Promise<LigaMXFixture[]> {
  try {
    const res = await fetch(
      'https://site.web.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=20260701-20261231&limit=200',
      { next: { revalidate: 60 } },
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
        id: event.id, date: event.date, league: 'liga-mx',
        jornada: event.week?.number ? `Jornada ${event.week.number}` : null,
        status: { completed: event.status?.type?.completed ?? false, state: event.status?.type?.state ?? 'pre', description: event.status?.type?.description ?? '', shortDetail: event.status?.type?.shortDetail ?? '', displayClock: event.status?.displayClock ?? '' },
        venue: comp?.venue?.fullName ?? null, city: comp?.venue?.address?.city ?? null,
        home: { name: home?.team?.displayName ?? '', abbreviation: home?.team?.abbreviation ?? '', score: home?.score ?? null },
        away: { name: away?.team?.displayName ?? '', abbreviation: away?.team?.abbreviation ?? '', score: away?.score ?? null },
      };
    });
  } catch { return []; }
}

export default async function LigaMXPage() {
  const [table, fixtures] = await Promise.all([fetchTable(), fetchFixtures()]);
  return (
    <>
      <SiteNav />
      <LiveTicker />
      <LigaMXView initialTable={table} initialFixtures={fixtures} />
    </>
  );
}
