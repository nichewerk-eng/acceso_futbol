import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from './sports/espnFallback';
import { groupHorarioRounds } from './sports/horariosBoard';
import { groupFixturesByBoardDay, horarioTimeIn, horarioTimeMx } from './horariosCopy';

describe('horarioTimeMx', () => {
  it('prints the Apertura board clock for summer UTC-5 fixtures', () => {
    assert.equal(horarioTimeMx('2026-08-28T20:00:00-05:00'), '20:00');
    assert.equal(horarioTimeMx('2026-08-29T01:00:00Z'), '20:00');
  });

  it('prints CST after 24 Oct', () => {
    assert.equal(horarioTimeMx('2026-10-26T20:00:00-06:00'), '20:00');
    assert.equal(horarioTimeMx('2026-10-27T02:00:00Z'), '20:00');
  });

  it('converts the same instant into the viewer timezone', () => {
    assert.equal(horarioTimeIn('2026-08-29T01:00:00Z', 'America/Chicago'), '20:00');
    assert.equal(horarioTimeIn('2026-08-29T01:00:00Z', 'America/Los_Angeles'), '18:00');
  });
});

describe('groupFixturesByBoardDay', () => {
  it('splits Jornada 6 into Friday, Saturday and Sunday', () => {
    const j6 = groupHorarioRounds(seedLigaMxFixtures()).find((r) => r.number === 6);
    assert.ok(j6);
    const days = groupFixturesByBoardDay(j6.fixtures);
    assert.equal(days.length, 3);
    assert.equal(days[0].fixtures.length, 3);
    assert.equal(days[1].fixtures.length, 4);
    assert.equal(days[2].fixtures.length, 2);
  });
});
