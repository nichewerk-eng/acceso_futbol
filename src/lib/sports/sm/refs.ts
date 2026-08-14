import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { smFetch } from './client';
import type { MatchState } from '../types';

const REFS_TTL_MS = 12 * 60 * 60_000;
const STATES_KEY = 'sm-states-v1';

/** Common football state ids when /states has not hydrated yet. */
const STATE_ID_TO_MATCH: Record<number, MatchState> = {
  1: 'pre', // NS
  2: 'in', // INPLAY
  3: 'post', // FT
  4: 'pre', // POSTPONED
  5: 'post', // CANCELLED
  6: 'post', // ABANDONED
  7: 'in', // SUSPENDED
  8: 'post', // AWARDED
  14: 'in', // BREAK
  15: 'in', // HT
  16: 'in', // ET
  17: 'in', // PEN_LIVE
  21: 'post', // AET
  22: 'post', // FT_PEN
};

type SmState = {
  id?: number;
  state?: string;
  short_name?: string;
  name?: string;
  developer_name?: string;
};

function blobOf(s?: {
  state?: string;
  short_name?: string;
  name?: string;
  developer_name?: string;
}): string {
  return `${s?.developer_name ?? ''} ${s?.state ?? ''} ${s?.short_name ?? ''} ${s?.name ?? ''}`.toUpperCase();
}

export function matchStateFromBlob(raw?: string): MatchState {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('inplay') || s === 'live' || s === '1st' || s === '2nd' || s === 'ht') {
    return 'in';
  }
  if (s.includes('ft') || s.includes('full') || s === 'finished' || s === 'completed') {
    return 'post';
  }
  return 'pre';
}

export function matchStateFromId(id?: number | null): MatchState | null {
  if (id == null || !Number.isFinite(id)) return null;
  const cached = getCache<Record<number, MatchState>>(STATES_KEY, REFS_TTL_MS);
  if (cached && cached[id]) return cached[id];
  return STATE_ID_TO_MATCH[id] ?? null;
}

function indexStates(rows: SmState[]): Record<number, MatchState> {
  const out: Record<number, MatchState> = { ...STATE_ID_TO_MATCH };
  for (const row of rows) {
    if (row.id == null) continue;
    out[row.id] = matchStateFromBlob(blobOf(row));
  }
  return out;
}

/** Warm /states into memory. Never await on the live path. */
export function ensureSmRefs(): void {
  if (getCache(STATES_KEY, REFS_TTL_MS)) return;
  void singleFlight(STATES_KEY, REFS_TTL_MS, async () => {
    const data = await smFetch<{ data?: SmState[] }>('/states', {}, 'catalog');
    const index = indexStates(data.data ?? []);
    setCache(STATES_KEY, index);
    return index;
  }).catch(() => null);
}
