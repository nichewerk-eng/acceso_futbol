import { attachDondeVer } from '@/config/dondeVer';
import { editorialWeather } from '@/config/editorialWeather';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture, PulsePayload } from './types';
import { fetchEspnLigaMxFixtures, fetchLigaMxFixtures } from './espnFallback';
import { isFixtureHeld } from './localizeEs';

function partition(fixtures: Fixture[], now = new Date()): Pick<PulsePayload, 'live' | 'upcoming' | 'recent'> {
  const dayKey = mexicoDayKey(now);
  const live = fixtures.filter((f) => f.state === 'in');
  const upcoming = fixtures
    .filter((f) => f.state === 'pre' && !isFixtureHeld(f.statusLabel) && isMexicoDay(f.date, dayKey))
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

/**
 * Pulse reads the one canonical Liga MX board (same source as jornada/pulse/club),
 * then partitions into live / today's upcoming / today's recent. Sourcing from the
 * shared board is what guarantees the hero and "en vivo + sellados" agree on scores.
 */
export async function getPulse(): Promise<PulsePayload> {
  const weather = editorialWeather();

  try {
    const { fixtures, source } = await fetchLigaMxFixtures();
    const ligaMx = fixtures.filter((f) => f.league === 'liga-mx');
    return {
      source,
      generatedAt: new Date().toISOString(),
      ...partition(withBridge(ligaMx)),
      weather,
    };
  } catch {
    // Board itself already falls back to ESPN/static; this is last-resort safety.
    const { fixtures, source } = await fetchEspnLigaMxFixtures();
    return {
      source,
      generatedAt: new Date().toISOString(),
      ...partition(withBridge(fixtures)),
      weather,
    };
  }
}
