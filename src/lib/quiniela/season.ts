/**
 * Season memory + rachas — Phase 2 of the quiniela retention plan.
 *
 * Everything accrues off the existing 1-point results (`scoreCard`). Totals are
 * rolled up **once per jornada, at seal time** (never rescanned per request):
 * the first request that sees a fully-`post` jornada that isn't in the rolled
 * set grabs a KV lock, scores every saved card, and increments each player's
 * cumulative record + streaks. Idempotent via the rolled set + lock (see R3/R4).
 *
 * Storage mirrors `store.ts` / `account.ts` — durable Upstash hashes with a
 * process-memory fallback so the whole flow works in local dev without KV.
 *
 *   quiniela:season:{torneo}         hash  userId -> JSON(SeasonRecord)
 *   quiniela:season-rolled:{torneo}  key   JSON number[] of sealed jornadas done
 *   quiniela:season-lock:{torneo}    key   short-lived rollup mutex
 */

import type { Fixture } from '@/lib/sports/types';
import {
  kvDel,
  kvGetJson,
  kvHdel,
  kvHget,
  kvHgetall,
  kvHset,
  kvSetJson,
  kvSetNx,
  sharedKvEnabled,
} from '@/lib/sharedKv';
import { sanitizeName } from './name';
import { QUINIELA_TORNEO, jornadaKeyFor, jornadaResults, sealedJornadaNumbers } from './service';
import { listPicks } from './store';
import type { Outcome, SeasonMe, SeasonView } from './types';

/** Cumulative per-player record across sealed jornadas. */
export interface SeasonRecord {
  name: string;
  /** Cumulative correct picks. */
  points: number;
  /** Cumulative graded picks (finals the player had a pick for). */
  played: number;
  jornadasPlayed: number;
  lastJornada: number;
  bestJornada: number;
  /** Consecutive jornadas played (loss-aversion driver). */
  participation: number;
  bestParticipation: number;
  /** Consecutive correct picks across matches. */
  accuracy: number;
  bestAccuracy: number;
  updatedAt: number;
}

const SEASON_HASH = `quiniela:season:${QUINIELA_TORNEO}`;
const ROLLED_KEY = `quiniela:season-rolled:${QUINIELA_TORNEO}`;
const LOCK_KEY = `quiniela:season-lock:${QUINIELA_TORNEO}`;
const LOCK_TTL_MS = 120_000;
const ROLLED_TTL_MS = 400 * 24 * 3_600_000; // torneo-long
const STANDINGS_CACHE_MS = 45_000;

// Process fallback (dev / no KV).
const memSeason = new Map<string, SeasonRecord>();
const memRolled = new Set<number>();

/** Per-isolate high-water mark so steady-state requests skip KV entirely. */
let rolledThroughThisIsolate = 0;

// ── Pure scoring / streak math (unit-tested) ────────────────────────────────

export interface CardScore {
  correct: number;
  played: number;
  /** Correctness of each graded pick in kickoff order (accuracy-streak input). */
  gradedInOrder: boolean[];
}

/** Score one saved card against a jornada's results, in kickoff order. */
export function scoreCard(
  orderedIds: string[],
  resultById: Map<string, Outcome>,
  picks: Record<string, Outcome>
): CardScore {
  let correct = 0;
  let played = 0;
  const gradedInOrder: boolean[] = [];
  for (const id of orderedIds) {
    const res = resultById.get(id);
    const pick = picks[id];
    if (!res || !pick) continue; // ungraded or unpicked → a gap, not a break
    played += 1;
    const ok = pick === res;
    if (ok) correct += 1;
    gradedInOrder.push(ok);
  }
  return { correct, played, gradedInOrder };
}

const EMPTY_RECORD: SeasonRecord = {
  name: '',
  points: 0,
  played: 0,
  jornadasPlayed: 0,
  lastJornada: 0,
  bestJornada: 0,
  participation: 0,
  bestParticipation: 0,
  accuracy: 0,
  bestAccuracy: 0,
  updatedAt: 0,
};

/** Fold one jornada's score into a player's running record. */
export function applyJornadaToRecord(
  prev: SeasonRecord | null,
  input: { n: number; name: string; score: CardScore }
): SeasonRecord {
  const base = prev ?? EMPTY_RECORD;
  const { n, name, score } = input;
  const participation = base.lastJornada === n - 1 ? base.participation + 1 : 1;
  let accuracy = base.accuracy;
  let bestAccuracy = base.bestAccuracy;
  for (const ok of score.gradedInOrder) {
    accuracy = ok ? accuracy + 1 : 0;
    if (accuracy > bestAccuracy) bestAccuracy = accuracy;
  }
  return {
    name: name || base.name,
    points: base.points + score.correct,
    played: base.played + score.played,
    jornadasPlayed: base.jornadasPlayed + 1,
    lastJornada: n,
    bestJornada: Math.max(base.bestJornada, score.correct),
    participation,
    bestParticipation: Math.max(base.bestParticipation, participation),
    accuracy,
    bestAccuracy,
    updatedAt: Date.now(),
  };
}

// ── Storage (KV + memory) ────────────────────────────────────────────────────

let standingsCache: { at: number; rows: { userId: string; rec: SeasonRecord }[] } | null = null;

function parseRecord(raw: string): SeasonRecord | null {
  try {
    const o = JSON.parse(raw) as Partial<SeasonRecord>;
    if (typeof o.points !== 'number') return null;
    return { ...EMPTY_RECORD, ...o, name: typeof o.name === 'string' ? o.name : '' };
  } catch {
    return null;
  }
}

async function getAllRecords(): Promise<Map<string, SeasonRecord>> {
  if (!sharedKvEnabled()) return new Map(memSeason);
  const all = await kvHgetall(SEASON_HASH);
  if (all == null) {
    if (standingsCache) {
      return new Map(standingsCache.rows.map((r) => [r.userId, r.rec]));
    }
    return new Map();
  }
  const out = new Map<string, SeasonRecord>();
  for (const [uid, raw] of Object.entries(all)) {
    const rec = parseRecord(raw);
    if (rec) out.set(uid, rec);
  }
  return out;
}

async function getRecord(userId: string): Promise<SeasonRecord | null> {
  if (!sharedKvEnabled()) return memSeason.get(userId) ?? null;
  const raw = await kvHget(SEASON_HASH, userId);
  return raw ? parseRecord(raw) : null;
}

async function putRecord(userId: string, rec: SeasonRecord): Promise<void> {
  standingsCache = null;
  if (!sharedKvEnabled()) {
    memSeason.set(userId, rec);
    return;
  }
  await kvHset(SEASON_HASH, userId, JSON.stringify(rec));
}

async function delRecord(userId: string): Promise<void> {
  standingsCache = null;
  if (!sharedKvEnabled()) {
    memSeason.delete(userId);
    return;
  }
  await kvHdel(SEASON_HASH, userId);
}

export async function countSeasonRecords(): Promise<number> {
  return (await getAllRecords()).size;
}

/** Wipe every season record + rolled set (ops reset). Accounts are left intact. */
export async function resetSeason(): Promise<number> {
  const n = await countSeasonRecords();
  standingsCache = null;
  rolledThroughThisIsolate = 0;
  memSeason.clear();
  memRolled.clear();
  if (sharedKvEnabled()) {
    await kvDel(SEASON_HASH);
    await kvDel(ROLLED_KEY);
    await kvDel(LOCK_KEY);
  }
  return n;
}

async function readRolled(): Promise<Set<number>> {
  if (!sharedKvEnabled()) return new Set(memRolled);
  const rec = await kvGetJson<number[]>(ROLLED_KEY);
  const arr = rec?.data;
  return new Set(Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : []);
}

async function writeRolled(s: Set<number>): Promise<void> {
  const arr = [...s].sort((a, b) => a - b);
  memRolled.clear();
  for (const n of arr) memRolled.add(n);
  if (sharedKvEnabled()) await kvSetJson(ROLLED_KEY, arr, ROLLED_TTL_MS);
}

// ── Rollup ───────────────────────────────────────────────────────────────────

async function rollupPending(
  pending: number[],
  fixtures: Fixture[],
  markRolled: (n: number) => Promise<void>
): Promise<void> {
  const records = await getAllRecords();
  for (const n of pending) {
    const results = jornadaResults(fixtures, n);
    if (!results.sealed) continue;
    const cards = await listPicks(jornadaKeyFor(n));
    if (cards == null) throw new Error('quiniela_picks_unavailable');
    for (const card of cards) {
      const name = sanitizeName(card.name);
      if (!name) continue; // unnamed cards are excluded, same as the leaderboard
      const score = scoreCard(results.orderedIds, results.resultById, card.picks);
      const next = applyJornadaToRecord(records.get(card.userId) ?? null, { n, name, score });
      records.set(card.userId, next);
      await putRecord(card.userId, next);
    }
    await markRolled(n);
  }
}

/**
 * Roll up any fully-`post` jornada that hasn't been counted yet. Cheap + a
 * no-op in steady state (per-isolate high-water mark short-circuits before any
 * KV read); does real work only right after a jornada seals. Safe to call on
 * every request. Swallows all errors — must never break the board.
 */
export async function rollupSeason(fixtures: Fixture[]): Promise<void> {
  try {
    const sealed = sealedJornadaNumbers(fixtures);
    if (sealed.length === 0) return;
    const maxSealed = sealed[sealed.length - 1];
    if (maxSealed <= rolledThroughThisIsolate) return;

    const rolled = await readRolled();
    const pending = sealed.filter((n) => !rolled.has(n));
    if (pending.length === 0) {
      rolledThroughThisIsolate = maxSealed;
      return;
    }

    if (!sharedKvEnabled()) {
      const set = new Set(memRolled);
      await rollupPending(pending, fixtures, async (n) => {
        set.add(n);
        await writeRolled(set);
      });
      rolledThroughThisIsolate = maxSealed;
      return;
    }

    // One rollup at a time across isolates; a loser simply retries on a later request.
    const got = await kvSetNx(LOCK_KEY, String(Date.now()), LOCK_TTL_MS);
    if (!got) return;
    try {
      const fresh = await readRolled();
      const stillPending = pending.filter((n) => !fresh.has(n));
      await rollupPending(stillPending, fixtures, async (n) => {
        fresh.add(n);
        await writeRolled(fresh);
      });
      rolledThroughThisIsolate = maxSealed;
    } finally {
      await kvDel(LOCK_KEY);
    }
  } catch {
    /* rollup must never break the request path */
  }
}

// ── Read side ─────────────────────────────────────────────────────────────────

async function sortedStandings(): Promise<{ userId: string; rec: SeasonRecord }[]> {
  const now = Date.now();
  if (standingsCache && now - standingsCache.at < STANDINGS_CACHE_MS) return standingsCache.rows;
  const map = await getAllRecords();
  const rows = [...map.entries()]
    .map(([userId, rec]) => ({ userId, rec }))
    .sort(
      (a, b) =>
        b.rec.points - a.rec.points ||
        b.rec.jornadasPlayed - a.rec.jornadasPlayed ||
        a.rec.name.localeCompare(b.rec.name)
    );
  standingsCache = { at: now, rows };
  return rows;
}

/** Season standings + the caller's card. Null before the first jornada seals. */
export async function getSeasonView(userId: string | null, topN = 20): Promise<SeasonView | null> {
  const rows = await sortedStandings();
  if (rows.length === 0) return null;
  const top = rows.slice(0, topN).map((r) => ({
    userId: r.userId,
    name: r.rec.name,
    points: r.rec.points,
    jornadasPlayed: r.rec.jornadasPlayed,
  }));
  let me: SeasonMe | null = null;
  if (userId) {
    const idx = rows.findIndex((r) => r.userId === userId);
    if (idx >= 0) {
      const r = rows[idx].rec;
      me = {
        rank: idx + 1,
        entries: rows.length,
        points: r.points,
        played: r.played,
        jornadasPlayed: r.jornadasPlayed,
        bestJornada: r.bestJornada,
        winRate: r.played > 0 ? Math.round((r.points / r.played) * 100) : 0,
        participation: r.participation,
        bestParticipation: r.bestParticipation,
        accuracy: r.accuracy,
        bestAccuracy: r.bestAccuracy,
      };
    }
  }
  return { me, top, entries: rows.length };
}

/**
 * On magic-link claim: carry the anon id's accrued season onto the account (only
 * when the account has none yet — never clobber real account history), then
 * **retire the anon record** so the player isn't listed twice on the season tabla.
 * This is what keeps "guarda tu racha" honest — claiming preserves the streak
 * without cloning it.
 */
export async function mergeSeasonRecord(fromId: string, toId: string): Promise<boolean> {
  if (!fromId || !toId || fromId === toId) return false;
  const from = await getRecord(fromId);
  if (!from) return false;
  const existing = await getRecord(toId);
  if (!existing) await putRecord(toId, { ...from, updatedAt: Date.now() });
  await delRecord(fromId);
  return !existing;
}
