import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { overlayLiveLeaders, type GoleoBoard } from './leaders';
import type { Fixture } from './types';

const board: GoleoBoard = {
  seasonLabel: 'Apertura 2026',
  generatedAt: '2026-08-30T00:00:00.000Z',
  goals: [
    {
      rank: 1,
      athleteId: '1',
      name: 'Lucas Ocampos',
      teamAbbr: 'MTY',
      teamName: 'Monterrey',
      value: 5,
    },
  ],
  assists: [
    {
      rank: 1,
      athleteId: '2',
      name: 'Juan Brunetta',
      teamAbbr: 'UANL',
      teamName: 'Tigres UANL',
      value: 3,
    },
  ],
};

function liveGoal(name: string, abbr: string, assist?: string): Fixture {
  return {
    id: '1',
    provider: 'sportmonks',
    league: 'liga-mx',
    date: '2026-08-31T02:10:00Z',
    jornada: 'Jornada 6',
    state: 'in',
    statusLabel: 'En vivo',
    home: { id: 'mty', name: 'Monterrey', abbreviation: 'MTY', score: '1' },
    away: { id: 'asl', name: 'Atlético San Luis', abbreviation: 'ASL', score: '0' },
    scorers: [{ name, minute: '12', side: 'home' }],
    assists: assist ? [{ name: assist, minute: '12', side: 'home' }] : undefined,
  };
}

describe('overlayLiveLeaders', () => {
  it('bumps an existing scorer while the match is in play', () => {
    const next = overlayLiveLeaders(board, [liveGoal('Lucas Ocampos', 'MTY')]);
    assert.equal(next.goals[0]?.value, 6);
    assert.equal(next.goals[0]?.name, 'Lucas Ocampos');
  });

  it('inserts a new live scorer and re-ranks', () => {
    const next = overlayLiveLeaders(board, [liveGoal('Sergio Canales', 'MTY')]);
    assert.equal(next.goals[0]?.name, 'Lucas Ocampos');
    assert.equal(next.goals[0]?.value, 5);
    assert.equal(next.goals[1]?.name, 'Sergio Canales');
    assert.equal(next.goals[1]?.value, 1);
  });

  it('bumps live assists', () => {
    const next = overlayLiveLeaders(board, [liveGoal('Lucas Ocampos', 'MTY', 'Diego Rossi')]);
    const rossi = next.assists.find((e) => e.name === 'Diego Rossi');
    assert.equal(rossi?.value, 1);
    assert.equal(next.assists.find((e) => e.name === 'Juan Brunetta')?.value, 3);
  });

  it('ignores finished games so ESPN season totals are not double-counted', () => {
    const ft: Fixture = { ...liveGoal('Lucas Ocampos', 'MTY'), state: 'post', statusLabel: 'Final' };
    const next = overlayLiveLeaders(board, [ft]);
    assert.equal(next.goals[0]?.value, 5);
  });
});
