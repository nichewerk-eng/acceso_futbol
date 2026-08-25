import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Fixture } from '../sports/types';
import {
  applyJornadaToRecord,
  getSeasonView,
  mergeSeasonRecord,
  rollupSeason,
  scoreCard,
} from './season';
import { jornadaKeyFor } from './service';
import { putPicks } from './store';
import type { Outcome } from './types';

function fx(id: string, jn: number, date: string, hs: number, as: number): Fixture {
  return {
    id,
    provider: 'espn',
    league: 'liga-mx',
    date,
    jornada: `Jornada ${jn}`,
    state: 'post',
    statusLabel: 'Final',
    home: { id: `${id}-h`, name: 'Home', abbreviation: 'HOM', score: String(hs) },
    away: { id: `${id}-a`, name: 'Away', abbreviation: 'AWY', score: String(as) },
    winnerSide: hs > as ? 'home' : hs < as ? 'away' : null,
  };
}

describe('scoreCard', () => {
  it('counts correct/played and records correctness in kickoff order', () => {
    const results = new Map<string, Outcome>([
      ['m1', '1'],
      ['m2', 'X'],
      ['m3', '2'],
    ]);
    const picks: Record<string, Outcome> = { m1: '1', m2: '2', m3: '2' };
    const s = scoreCard(['m1', 'm2', 'm3'], results, picks);
    assert.equal(s.correct, 2);
    assert.equal(s.played, 3);
    assert.deepEqual(s.gradedInOrder, [true, false, true]);
  });

  it('skips ungraded and unpicked matches (a gap, not a break)', () => {
    const results = new Map<string, Outcome>([['m1', '1']]);
    const picks: Record<string, Outcome> = { m1: '1', m2: 'X' };
    const s = scoreCard(['m1', 'm2', 'm3'], results, picks);
    assert.equal(s.correct, 1);
    assert.equal(s.played, 1);
    assert.deepEqual(s.gradedInOrder, [true]);
  });
});

describe('applyJornadaToRecord', () => {
  it('extends the participation streak on consecutive jornadas', () => {
    let r = applyJornadaToRecord(null, {
      n: 1,
      name: 'A',
      score: { correct: 2, played: 2, gradedInOrder: [true, true] },
    });
    assert.equal(r.participation, 1);
    assert.equal(r.points, 2);
    assert.equal(r.accuracy, 2);
    assert.equal(r.bestJornada, 2);
    r = applyJornadaToRecord(r, {
      n: 2,
      name: 'A',
      score: { correct: 1, played: 3, gradedInOrder: [true, false, false] },
    });
    assert.equal(r.participation, 2);
    assert.equal(r.bestParticipation, 2);
    assert.equal(r.points, 3);
    assert.equal(r.played, 5);
    // accuracy: 2 → +1 = 3 (best), → 0, → 0
    assert.equal(r.accuracy, 0);
    assert.equal(r.bestAccuracy, 3);
    assert.equal(r.bestJornada, 2);
    assert.equal(r.jornadasPlayed, 2);
  });

  it('resets the participation streak when a jornada is skipped', () => {
    let g = applyJornadaToRecord(null, {
      n: 1,
      name: 'A',
      score: { correct: 1, played: 1, gradedInOrder: [true] },
    });
    g = applyJornadaToRecord(g, {
      n: 3,
      name: 'A',
      score: { correct: 0, played: 1, gradedInOrder: [false] },
    });
    assert.equal(g.participation, 1);
    assert.equal(g.jornadasPlayed, 2);
    assert.equal(g.lastJornada, 3);
  });
});

describe('rollupSeason + getSeasonView (memory fallback)', () => {
  const FIX: Fixture[] = [
    fx('m1', 1, '2026-08-01T00:00:00Z', 2, 0), // result 1
    fx('m2', 1, '2026-08-01T02:00:00Z', 1, 1), // result X
    fx('m3', 2, '2026-08-08T00:00:00Z', 0, 1), // result 2
    fx('m4', 2, '2026-08-08T02:00:00Z', 3, 1), // result 1
  ];

  it('accrues season totals + streaks across sealed jornadas and is idempotent', async () => {
    const ana: Record<string, Outcome> = { m1: '1', m2: 'X' };
    const anaJ2: Record<string, Outcome> = { m3: '2', m4: '1' };
    const ben: Record<string, Outcome> = { m1: '2', m2: 'X' };
    const benJ2: Record<string, Outcome> = { m3: '1', m4: '1' };
    await putPicks(jornadaKeyFor(1), { userId: 'ana00000', name: 'Ana', picks: ana, ts: 1 });
    await putPicks(jornadaKeyFor(1), { userId: 'ben00000', name: 'Ben', picks: ben, ts: 1 });
    await putPicks(jornadaKeyFor(2), { userId: 'ana00000', name: 'Ana', picks: anaJ2, ts: 1 });
    await putPicks(jornadaKeyFor(2), { userId: 'ben00000', name: 'Ben', picks: benJ2, ts: 1 });

    await rollupSeason(FIX);

    const view = await getSeasonView('ana00000');
    assert.ok(view);
    assert.equal(view.entries, 2);
    assert.equal(view.me?.rank, 1);
    assert.equal(view.me?.points, 4);
    assert.equal(view.me?.played, 4);
    assert.equal(view.me?.participation, 2);
    assert.equal(view.me?.bestParticipation, 2);
    assert.equal(view.me?.accuracy, 4);
    assert.equal(view.me?.bestJornada, 2);
    assert.equal(view.me?.winRate, 100);
    assert.equal(view.top[0]?.name, 'Ana');
    assert.equal(view.top[0]?.points, 4);

    const benView = await getSeasonView('ben00000');
    assert.ok(benView);
    assert.equal(benView.me?.rank, 2);
    assert.equal(benView.me?.points, 2);
    assert.equal(benView.me?.accuracy, 1);
    assert.equal(benView.me?.winRate, 50);

    // Running it again must not double-count.
    await rollupSeason(FIX);
    const again = await getSeasonView('ana00000');
    assert.ok(again);
    assert.equal(again.me?.points, 4);
    assert.equal(again.entries, 2);
  });

  it('mergeSeasonRecord moves an anon season onto an empty account and retires the anon', async () => {
    const before = await getSeasonView('ben00000');
    assert.ok(before);
    const merged = await mergeSeasonRecord('ben00000', 'acct0000');
    assert.equal(merged, true);

    const acct = await getSeasonView('acct0000');
    assert.ok(acct);
    assert.equal(acct.me?.points, before.me?.points);
    assert.equal(acct.me?.participation, before.me?.participation);

    // The anon id is gone — no duplicate row on the tabla.
    const benGone = await getSeasonView('ben00000');
    assert.ok(benGone);
    assert.equal(benGone.me, null);

    // Never clobber an account that already has history (and still retire the source).
    assert.equal(await mergeSeasonRecord('ana00000', 'acct0000'), false);
    const acctAfter = await getSeasonView('acct0000');
    assert.equal(acctAfter?.me?.points, before.me?.points);

    // Nothing to copy from.
    assert.equal(await mergeSeasonRecord('ghost999', 'brandnew1'), false);
  });
});
