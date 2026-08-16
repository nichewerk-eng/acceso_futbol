import { getCache, setCache, singleFlight } from '@/lib/apiCache';
import { smFetch } from './client';
import type { MatchState } from '../types';

const REFS_TTL_MS = 12 * 60 * 60_000;
const STATES_KEY = 'sm-states-v2';

/**
 * Sportmonks Football API 3.0 state ids.
 * @see https://docs.sportmonks.com/v3/definitions/states
 *
 * Legacy (wrong) table mapped 3→FT and 22→FT_PEN. Current catalog:
 * 3 = HT, 5 = FT, 22 = 2nd half. That froze live 2º tiempo as FT.
 */
const STATE_ID_TO_MATCH: Record<number, MatchState> = {
  1: 'pre', // NS
  2: 'in', // INPLAY_1ST_HALF
  3: 'in', // HT
  4: 'in', // BREAK (regular time done, waiting for ET)
  5: 'post', // FT
  6: 'in', // INPLAY_ET
  7: 'post', // AET
  8: 'post', // FT_PEN
  9: 'in', // INPLAY_PENALTIES
  10: 'pre', // POSTPONED
  11: 'in', // SUSPENDED
  12: 'post', // CANCELLED
  13: 'pre', // TBA
  14: 'post', // WO
  15: 'post', // ABANDONED
  16: 'pre', // DELAYED
  17: 'post', // AWARDED
  18: 'in', // INTERRUPTED
  19: 'in', // AWAITING_UPDATES
  20: 'post', // DELETED
  21: 'in', // EXTRA_TIME_BREAK
  22: 'in', // INPLAY_2ND_HALF
  25: 'in', // PEN_BREAK
  26: 'pre', // PENDING
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

const LIVE_RE =
  /\b(inplay|in[_\s-]?play|live|1st|2nd|ht|et|pen(?:alt)?|brk)\b|half|tiempo|descanso|suspended|interrupted|awaiting/;
const POST_RE =
  /\b(ft|aet|ft_pen|full[\s_-]?time|finished|completed|cancelled|canceled|abandoned|awarded|deleted|walk[\s_-]?over)\b/;

export function matchStateFromBlob(raw?: string): MatchState {
  const s = (raw ?? '').toLowerCase();
  if (!s.trim()) return 'pre';
  // "halftime" contains the letters "ft" — live tokens must win first.
  if (LIVE_RE.test(s)) return 'in';
  if (POST_RE.test(s)) return 'post';
  if (/\b(ns|tba|postponed|delayed|pending|not[\s_-]?started)\b/.test(s)) return 'pre';
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
    const mapped = matchStateFromBlob(blobOf(row));
    const hardcoded = STATE_ID_TO_MATCH[row.id];
    // Catalog blobs can mention FT as a group code; never demote a known live id.
    if (hardcoded === 'in' && mapped !== 'in') continue;
    out[row.id] = mapped;
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
