import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { jornadaNumber } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';
import { isOutcome, missingOpenPicks } from './card';
import { pickQuinielaJornada, quinielaHoldActive, QUINIELA_FROM } from './jornada';
import { sanitizeName } from './name';
import { delPicks, getPicks, listPicks, putPicks } from './store';
import type {
  LeaderRow,
  Outcome,
  QuinielaBoard,
  QuinielaLeaderboard,
  QuinielaMatch,
  QuinielaSide,
} from './types';

/** Bump when the torneo rolls so pick history / leaderboards don't collide. */
export const QUINIELA_TORNEO = 'apertura-2026';
export { QUINIELA_FROM };

const OUTCOMES: readonly Outcome[] = ['1', 'X', '2'];

export { isOutcome } from './card';

export function jornadaKeyFor(n: number): string {
  return `${QUINIELA_TORNEO}-j${n}`;
}

function num(s: string | null | undefined): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function outcomeOf(f: Fixture): Outcome | null {
  if (f.state !== 'post') return null;
  const h = num(f.home.score);
  const a = num(f.away.score);
  if (h != null && a != null) return h > a ? '1' : h < a ? '2' : 'X';
  if (f.winnerSide === 'home') return '1';
  if (f.winnerSide === 'away') return '2';
  return null;
}

function lockedNow(f: Fixture, now: number): boolean {
  return f.state !== 'pre' || +new Date(f.date) <= now;
}

function side(ref: Fixture['home']): QuinielaSide {
  return {
    name: ref.name,
    abbr: ref.abbreviation,
    clubId: clubIdentityFromAbbr(ref.abbreviation)?.id ?? null,
    logo: ref.logo,
    score: num(ref.score),
  };
}

function toMatch(f: Fixture, now: number): QuinielaMatch {
  return {
    id: f.id,
    date: f.date,
    state: f.state,
    locked: lockedNow(f, now),
    home: side(f.home),
    away: side(f.away),
    result: outcomeOf(f),
  };
}

export function boardFromFixtures(
  fixtures: Fixture[],
  now = new Date()
): QuinielaBoard | null {
  const n = pickQuinielaJornada(fixtures, now);
  if (n == null) return null;
  const round = fixtures
    .filter((f) => jornadaNumber(f.jornada) === n)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  if (round.length === 0) return null;
  const ms = now.getTime();
  const matches = round.map((f) => toMatch(f, ms));
  const open = matches.filter((m) => !m.locked);
  const finals = matches.filter((m) => m.result).length;
  const sealed = round.length > 0 && round.every((f) => f.state === 'post');
  return {
    torneo: QUINIELA_TORNEO,
    jornadaKey: jornadaKeyFor(n),
    jornadaNumber: n,
    jornadaLabel: `Jornada ${n}`,
    deadline: open.length ? open[0].date : null,
    matches,
    finals,
    total: matches.length,
    holding: sealed && quinielaHoldActive(round, now),
    generatedAt: now.toISOString(),
  };
}

export async function getQuinielaBoard(now = new Date()): Promise<QuinielaBoard | null> {
  const { fixtures } = await fetchLigaMxFixtures();
  return boardFromFixtures(fixtures, now);
}

export interface JornadaResults {
  n: number;
  total: number;
  /** Every fixture for the jornada has finished. */
  sealed: boolean;
  /** matchId → final outcome (graded matches only). */
  resultById: Map<string, Outcome>;
  /** All match ids for the jornada in kickoff order (chronological streaks). */
  orderedIds: string[];
}

/** Results + kickoff order for a specific jornada number — the season-rollup input. */
export function jornadaResults(fixtures: Fixture[], n: number): JornadaResults {
  const round = fixtures
    .filter((f) => jornadaNumber(f.jornada) === n)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const resultById = new Map<string, Outcome>();
  for (const f of round) {
    const o = outcomeOf(f);
    if (o) resultById.set(f.id, o);
  }
  return {
    n,
    total: round.length,
    sealed: round.length > 0 && round.every((f) => f.state === 'post'),
    resultById,
    orderedIds: round.map((f) => f.id),
  };
}

/** Jornada numbers whose every fixture has finished, ascending. */
export function sealedJornadaNumbers(fixtures: Fixture[]): number[] {
  const byNum = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const n = jornadaNumber(f.jornada);
    if (n == null) continue;
    const list = byNum.get(n) ?? [];
    list.push(f);
    byNum.set(n, list);
  }
  const out: number[] = [];
  for (const [n, games] of byNum) {
    if (games.length > 0 && games.every((g) => g.state === 'post')) out.push(n);
  }
  return out.filter((n) => n >= QUINIELA_FROM).sort((a, b) => a - b);
}

function scoreAgainst(
  board: QuinielaBoard,
  picks: Record<string, Outcome>
): { points: number; played: number; count: number } {
  const resultById = new Map(board.matches.map((m) => [m.id, m.result] as const));
  let points = 0;
  let played = 0;
  let count = 0;
  for (const [id, pick] of Object.entries(picks)) {
    count += 1;
    const res = resultById.get(id);
    if (res) {
      played += 1;
      if (res === pick) points += 1;
    }
  }
  return { points, played, count };
}

export function scoreUser(
  board: QuinielaBoard,
  picks: Record<string, Outcome>
): { points: number; played: number; count: number } {
  return scoreAgainst(board, picks);
}

export function leaderboardFromPicks(
  board: QuinielaBoard,
  all: { userId: string; name: string; picks: Record<string, Outcome> }[]
): QuinielaLeaderboard {
  const rows: LeaderRow[] = all
    .filter((p) => sanitizeName(p.name))
    .map((p) => {
      const s = scoreAgainst(board, p.picks);
      const name = sanitizeName(p.name)!;
      return {
        userId: p.userId,
        name,
        points: s.points,
        played: s.played,
        picks: s.count,
      };
    })
    .sort(
      (a, b) => b.points - a.points || b.played - a.played || a.name.localeCompare(b.name)
    );
  return { jornadaKey: board.jornadaKey, rows, entries: rows.length };
}

/** `null` when the picks hash could not be read (caller must not treat as empty). */
export async function getLeaderboard(board: QuinielaBoard): Promise<QuinielaLeaderboard | null> {
  const all = await listPicks(board.jornadaKey);
  if (all == null) return null;
  return leaderboardFromPicks(board, all);
}

const USER_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sanitizeUserId(v: unknown): string | null {
  return typeof v === 'string' && USER_ID_RE.test(v) ? v : null;
}

export { sanitizeName } from './name';

export interface SubmitResult {
  ok: boolean;
  error?: string;
  saved: number;
  rejected: number;
  board?: QuinielaBoard;
  picks?: Record<string, Outcome>;
}

/**
 * Merge new picks into the user's stored card, rejecting anything for a locked
 * or unknown match. Existing picks are preserved (progressive submission).
 */
export async function submitPicks(input: {
  userId: string;
  name?: string;
  picks: Record<string, unknown>;
}): Promise<SubmitResult> {
  const board = await getQuinielaBoard();
  if (!board) return { ok: false, error: 'no_jornada', saved: 0, rejected: 0 };

  const validIds = new Set(board.matches.map((m) => m.id));
  const lockedIds = new Set(board.matches.filter((m) => m.locked).map((m) => m.id));
  const existing = await getPicks(board.jornadaKey, input.userId);
  const merged: Record<string, Outcome> = { ...(existing?.picks ?? {}) };

  let saved = 0;
  let rejected = 0;
  for (const [id, pick] of Object.entries(input.picks ?? {})) {
    if (!validIds.has(id) || lockedIds.has(id) || !isOutcome(pick)) {
      rejected += 1;
      continue;
    }
    merged[id] = pick;
    saved += 1;
  }

  const name = sanitizeName(input.name) ?? sanitizeName(existing?.name);
  if (!name) return { ok: false, error: 'need_name', saved: 0, rejected: 0 };

  const missing = missingOpenPicks(board.matches, merged);
  if (missing.length) return { ok: false, error: 'need_card', saved: 0, rejected: 0 };
  if (Object.keys(merged).length === 0) {
    return { ok: false, error: 'need_card', saved: 0, rejected: 0 };
  }

  await putPicks(board.jornadaKey, {
    userId: input.userId,
    name,
    picks: merged,
    ts: Date.now(),
  });

  return { ok: true, saved, rejected, board, picks: merged };
}

/**
 * One-time claim merge: copy the anon id's current-jornada card onto the account
 * id (only when the account has no card yet — never clobber existing picks), then
 * **retire the anon entry** so the player isn't listed twice on the leaderboard.
 * Season/streak history accrues from the account going forward.
 */
export async function mergePicks(fromUserId: string, toUserId: string): Promise<boolean> {
  if (!fromUserId || fromUserId === toUserId) return false;
  const board = await getQuinielaBoard();
  if (!board) return false;
  const from = await getPicks(board.jornadaKey, fromUserId);
  if (!from || Object.keys(from.picks).length === 0) return false;
  const to = await getPicks(board.jornadaKey, toUserId);
  const accountHasCard = Boolean(to && Object.keys(to.picks).length > 0);
  if (!accountHasCard) {
    await putPicks(board.jornadaKey, {
      userId: toUserId,
      name: to?.name ?? from.name,
      picks: from.picks,
      ts: Date.now(),
    });
  }
  // Absorb the anon id: without this it lingers as a second leaderboard row.
  await delPicks(board.jornadaKey, fromUserId);
  return true;
}

export { OUTCOMES };
