import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formMatchFromLatest, selectLatestFinished } from './sportmonks';

const FT = { developer_name: 'FT', short_name: 'FT' };
const NS = { developer_name: 'NS', short_name: 'NS' };

describe('selectLatestFinished', () => {
  it('takes the last 5 across every competition, not one league', () => {
    const pool = selectLatestFinished(
      [
        { id: 'liga-old', starting_at: '2026-07-18 01:00:00', state: FT, league: 'Liga MX' },
        { id: 'lc-mia', starting_at: '2026-08-12 23:30:00', state: FT, league: 'Leagues Cup' },
        { id: 'lc-orl', starting_at: '2026-08-08 22:30:00', state: FT, league: 'Leagues Cup' },
        { id: 'lc-nsh', starting_at: '2026-08-06 00:30:00', state: FT, league: 'Leagues Cup' },
        { id: 'liga-ncx', starting_at: '2026-08-18 01:00:00', state: FT, league: 'Liga MX' },
        { id: 'liga-mty', starting_at: '2026-08-22 01:00:00', state: FT, league: 'Liga MX' },
        { id: 'upcoming', starting_at: '2026-08-26 02:30:00', state: NS, league: 'Leagues Cup' },
      ],
      5
    );
    assert.deepEqual(
      pool.map((f) => f.id),
      ['liga-mty', 'liga-ncx', 'lc-mia', 'lc-orl', 'lc-nsh']
    );
  });
});

describe('formMatchFromLatest', () => {
  it('uses this club as away even when they are listed second', () => {
    const row = formMatchFromLatest('2662', {
      id: 19715275,
      starting_at: '2026-08-22 01:00:00',
      participants: [
        { id: 2662, name: 'Monterrey', short_code: 'MNT', meta: { location: 'away', winner: false } },
        { id: 10836, name: 'León', short_code: 'LEO', meta: { location: 'home', winner: true } },
      ],
      scores: [
        { description: 'CURRENT', score: { goals: 2, participant: 'home' } },
        { description: 'CURRENT', score: { goals: 0, participant: 'away' } },
      ],
    });
    assert.ok(row);
    assert.equal(row.result, 'L');
    assert.equal(row.playedHome, false);
    assert.equal(row.opponentAbbr, 'LEO');
    assert.equal(row.homeScore, '2');
    assert.equal(row.awayScore, '0');
  });

  it('counts a Leagues Cup home win', () => {
    const row = formMatchFromLatest('2662', {
      id: 19687289,
      starting_at: '2026-08-13 00:00:00',
      participants: [
        { id: 148048, name: 'Nashville', short_code: 'NSH', meta: { location: 'away', winner: false } },
        { id: 2662, name: 'Monterrey', short_code: 'MNT', meta: { location: 'home', winner: true } },
      ],
      scores: [
        { description: 'CURRENT', score: { goals: 2, participant: 'home' } },
        { description: 'CURRENT', score: { goals: 1, participant: 'away' } },
      ],
    });
    assert.ok(row);
    assert.equal(row.result, 'W');
    assert.equal(row.playedHome, true);
    assert.equal(row.opponentAbbr, 'NSH');
  });
});
