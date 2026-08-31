import { attachDondeVer } from '@/config/dondeVer';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { fetchLigaMxFemenilFixtures } from '@/lib/sports/ligaMxFemenilBoard';
import { getMatch, peekMatch } from '@/lib/sports/getMatch';
import type { Fixture } from '@/lib/sports/types';

const LEAGUES = new Set(['liga-mx', 'liga-mx-femenil', 'leagues-cup', 'seleccion']);

export function selloLeague(raw: string): string | null {
  const league = raw.trim().toLowerCase();
  return LEAGUES.has(league) ? league : null;
}

/**
 * Load a fixture for a sello from the existing board. Liga MX goes through
 * fetchLigaMxFixtures (one livescores overlay). No second live merge.
 */
export async function loadSelloFixture(league: string, id: string): Promise<Fixture | null> {
  const key = selloLeague(league);
  if (!key) return null;

  const peeked = peekMatch(key, id);
  if (peeked) return peeked;

  if (key === 'liga-mx') {
    const board = await fetchLigaMxFixtures().catch(() => null);
    const hit = board?.fixtures.find((f) => f.id === id);
    if (hit) return attachDondeVer(hit);
  }

  if (key === 'liga-mx-femenil') {
    const board = await fetchLigaMxFemenilFixtures().catch(() => null);
    const hit = board?.fixtures.find((f) => f.id === id);
    if (hit) return attachDondeVer(hit);
  }

  return getMatch(key, id).catch(() => null);
}
