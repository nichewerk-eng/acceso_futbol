import { attachDondeVer } from '@/config/dondeVer';
import { editorialWeather } from '@/config/editorialWeather';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture, PulsePayload } from './types';
import { fetchEspnLigaMxFixtures } from './espnFallback';
import { fetchFixturesByDate, fetchLivescores, sportmonksEnabled } from './sportmonks';

function partition(fixtures: Fixture[], now = new Date()): Pick<PulsePayload, 'live' | 'upcoming' | 'recent'> {
  const dayKey = mexicoDayKey(now);
  const live = fixtures.filter((f) => f.state === 'in');
  const upcoming = fixtures
    .filter((f) => f.state === 'pre' && isMexicoDay(f.date, dayKey))
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 12);
  const recent = fixtures
    .filter((f) => f.state === 'post' && isMexicoDay(f.date, dayKey))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 8);
  return { live, upcoming, recent };
}

function withBridge(fixtures: Fixture[]): Fixture[] {
  return fixtures.map(attachDondeVer);
}

export async function getPulse(): Promise<PulsePayload> {
  const weather = editorialWeather();

  if (sportmonksEnabled()) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [liveSm, dated] = await Promise.all([
        fetchLivescores(),
        fetchFixturesByDate(today),
      ]);
      const byId = new Map<string, Fixture>();
      for (const f of [...liveSm, ...dated]) byId.set(f.id, f);
      const fixtures = withBridge([...byId.values()]);
      const parts = partition(fixtures);
      return {
        source: 'sportmonks',
        generatedAt: new Date().toISOString(),
        ...parts,
        weather,
      };
    } catch {
      // Sportmonks down → ESPN below
    }
  }

  const { fixtures, source } = await fetchEspnLigaMxFixtures();
  const parts = partition(withBridge(fixtures));
  return {
    source,
    generatedAt: new Date().toISOString(),
    ...parts,
    weather,
  };
}
