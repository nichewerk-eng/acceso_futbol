import { Metadata } from 'next';
import StandingsView from '@/components/standings/StandingsView';
import type { Group, Fixture } from '@/components/standings/types';

export const metadata: Metadata = {
  title: 'Tabla de Posiciones | FIFA World Cup 2026',
  description:
    'Tabla de posiciones en tiempo real del Mundial 2026. Resultados, grupos y próximos partidos.',
};

export const revalidate = 60;

async function fetchGroups(): Promise<Group[]> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings',
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const raw = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (raw.children ?? []).map((group: any) => ({
      name: group.name,
      abbreviation: group.abbreviation,
      entries: (group.standings?.entries ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((entry: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sm = Object.fromEntries(entry.stats.map((s: any) => [s.abbreviation, s]));
          return {
            position: Number(sm['R']?.value ?? 0),
            team: {
              id: entry.team.id,
              name: entry.team.displayName,
              abbreviation: entry.team.abbreviation,
            },
            note: entry.note ?? null,
            gp: Number(sm['GP']?.value ?? 0),
            w: Number(sm['W']?.value ?? 0),
            d: Number(sm['D']?.value ?? 0),
            l: Number(sm['L']?.value ?? 0),
            gf: Number(sm['F']?.value ?? 0),
            ga: Number(sm['A']?.value ?? 0),
            gd: sm['GD']?.displayValue ?? '0',
            pts: Number(sm['P']?.value ?? 0),
          };
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a.position - b.position),
    }));
  } catch {
    return [];
  }
}

async function fetchFixtures(): Promise<Fixture[]> {
  try {
    const res = await fetch(
      'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260704&limit=200',
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
        id: event.id,
        date: event.date,
        status: {
          completed: event.status?.type?.completed ?? false,
          state: event.status?.type?.state ?? 'pre',
          description: event.status?.type?.description ?? '',
          shortDetail: event.status?.type?.shortDetail ?? '',
        },
        venue: comp?.venue?.fullName ?? null,
        city: comp?.venue?.address?.city ?? null,
        home: {
          name: home?.team?.displayName ?? '',
          abbreviation: home?.team?.abbreviation ?? '',
          score: home?.score ?? null,
        },
        away: {
          name: away?.team?.displayName ?? '',
          abbreviation: away?.team?.abbreviation ?? '',
          score: away?.score ?? null,
        },
      };
    });
  } catch {
    return [];
  }
}

export default async function TablaPage() {
  const [initialGroups, initialFixtures] = await Promise.all([
    fetchGroups(),
    fetchFixtures(),
  ]);

  return (
    <StandingsView
      initialGroups={initialGroups}
      initialFixtures={initialFixtures}
    />
  );
}
