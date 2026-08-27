import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { adoptLeaderboard } from './leaderboard';
import type { LeaderRow, QuinielaLeaderboard } from './types';

function board(jornadaKey: string, names: string[]): QuinielaLeaderboard {
  const rows: LeaderRow[] = names.map((name, i) => ({
    userId: `u${i}`,
    name,
    points: names.length - i,
    played: 0,
    picks: 9,
  }));
  return { jornadaKey, rows, entries: rows.length };
}

describe('adoptLeaderboard', () => {
  it('keeps the previous tabla when the poll omits the leaderboard', () => {
    const prev = board('apertura-2026-j6', ['Jonathan']);
    assert.equal(adoptLeaderboard(prev, undefined), prev);
    assert.equal(adoptLeaderboard(prev, null), prev);
  });

  it('does not flash empty on a same-jornada failed read', () => {
    const prev = board('apertura-2026-j6', ['Jonathan', 'Ana']);
    const empty = board('apertura-2026-j6', []);
    assert.equal(adoptLeaderboard(prev, empty), prev);
  });

  it('accepts an empty tabla when the jornada rolls', () => {
    const prev = board('apertura-2026-j6', ['Jonathan']);
    const next = board('apertura-2026-j7', []);
    assert.equal(adoptLeaderboard(prev, next), next);
  });

  it('adopts a populated poll', () => {
    const prev = board('apertura-2026-j6', ['Ana']);
    const next = board('apertura-2026-j6', ['Jonathan', 'Ana']);
    assert.equal(adoptLeaderboard(prev, next), next);
  });
});
