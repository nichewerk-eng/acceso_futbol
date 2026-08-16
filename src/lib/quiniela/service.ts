import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import { getJornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';
import { getPicks, listPicks, putPicks } from './store';
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

const OUTCOMES: readonly Outcome[] = ['1', 'X', '2'];

export function isOutcome(v: unknown): v is Outcome {
  return v === '1' || v === 'X' || v === '2';
}

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

export async function getQuinielaBoard(now = new Date()): Promise<QuinielaBoard | null> {
  const overview = await getJornadaOverview(now);
  if (!overview) return null;
  const ms = now.getTime();
  const fixtures = [...overview.upcoming, ...overview.live, ...overview.played].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date)
  );
  const matches = fixtures.map((f) => toMatch(f, ms));
  const open = matches.filter((m) => !m.locked);
  return {
    torneo: QUINIELA_TORNEO,
    jornadaKey: jornadaKeyFor(overview.number),
    jornadaNumber: overview.number,
    jornadaLabel: overview.label,
    deadline: open.length ? open[0].date : null,
    matches,
    finals: matches.filter((m) => m.result).length,
    total: matches.length,
    generatedAt: new Date().toISOString(),
  };
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

export async function getLeaderboard(board: QuinielaBoard): Promise<QuinielaLeaderboard> {
  const all = await listPicks(board.jornadaKey);
  const rows: LeaderRow[] = all
    .map((p) => {
      const s = scoreAgainst(board, p.picks);
      return {
        userId: p.userId,
        name: p.name || 'Anónimo',
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

const USER_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function sanitizeUserId(v: unknown): string | null {
  return typeof v === 'string' && USER_ID_RE.test(v) ? v : null;
}

export function sanitizeName(v: unknown, fallback = 'Anónimo'): string {
  if (typeof v !== 'string') return fallback;
  const clean = v.replace(/\s+/g, ' ').trim().slice(0, 24);
  return clean || fallback;
}

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

  const name = sanitizeName(input.name, existing?.name || 'Anónimo');
  await putPicks(board.jornadaKey, {
    userId: input.userId,
    name,
    picks: merged,
    ts: Date.now(),
  });

  return { ok: true, saved, rejected, board, picks: merged };
}

export { OUTCOMES };
