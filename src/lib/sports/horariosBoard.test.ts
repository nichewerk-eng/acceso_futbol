import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from './espnFallback';
import { focusHorarioRounds, groupHorarioRounds } from './horariosBoard';

describe('groupHorarioRounds', () => {
  it('groups the Apertura calendar into 17 jornadas', () => {
    const rounds = groupHorarioRounds(seedLigaMxFixtures());
    assert.equal(rounds.length, 17);
    assert.equal(rounds[0].number, 1);
    assert.equal(rounds[5].number, 6);
    assert.equal(rounds[5].fixtures.length, 9);
    assert.equal(rounds[5].fixtures[0].home.abbreviation, 'ATL');
    assert.equal(rounds[5].fixtures[0].away.abbreviation, 'LEO');
  });
});

describe('focusHorarioRounds', () => {
  it('returns the current jornada and the next one', () => {
    const rounds = groupHorarioRounds(seedLigaMxFixtures());
    const focus = focusHorarioRounds(rounds, 5);
    assert.deepEqual(
      focus.map((r) => r.number),
      [5, 6]
    );
  });
});
