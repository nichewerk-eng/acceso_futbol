import { paintDondeVerList } from '@/lib/dondeVer/sheet';
import { fetchLigaMxFixtures } from './espnFallback';
import {
  buildLiguillaBoard,
  isLiguillaFixture,
  liguillaFixtures,
  type LiguillaBoard,
} from './liguilla';

export type LiguillaPayload = LiguillaBoard & { source: 'sportmonks' | 'espn' | 'static' };

/** Liguilla view of the one Liga MX board (scores never come from a second feed). */
export async function getLiguillaBoard(now = new Date()): Promise<LiguillaPayload> {
  const { fixtures, source } = await fetchLigaMxFixtures();
  const liguilla = await paintDondeVerList(fixtures.filter(isLiguillaFixture));
  return { ...buildLiguillaBoard(liguilla, now), source };
}

/** Cache hits: re-resolve channels from the sheet and re-slice "hoy" against the clock. */
export async function repaintLiguillaBoard(
  payload: LiguillaPayload,
  now = new Date()
): Promise<LiguillaPayload> {
  const painted = await paintDondeVerList(liguillaFixtures(payload));
  return { ...buildLiguillaBoard(painted, now, payload.seeds), source: payload.source };
}
