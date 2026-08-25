import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from '../sports/espnFallback';
import type { Fixture, MatchState } from '../sports/types';
import {
  pickQuinielaJornada,
  quinielaHoldThroughDay,
  QUINIELA_FROM,
} from './jornada';

function fx(
  id: string,
  date: string,
  jornada: number,
  state: MatchState
): Fixture {
  return {
    id,
    provider: 'sportmonks',
    league: 'liga-mx',
    date,
    jornada: `Jornada ${jornada}`,
    state,
    statusLabel: state === 'post' ? 'Final' : state === 'in' ? 'En vivo' : 'Próximo',
    home: { id: 'h', name: 'Home', abbreviation: 'HOM' },
    away: { id: 'a', name: 'Away', abbreviation: 'AWY' },
  };
}

/** J5 last kickoff: Sunday 23 Aug 2026, 8pm Mexico. */
const J5_LAST = '2026-08-23T20:00:00-05:00';
const J5_EARLY = '2026-08-22T20:00:00-05:00';
/** J6 first / last kickoff. */
const J6_FIRST = '2026-08-28T20:00:00-05:00';
const J6_LAST = '2026-08-30T21:00:00-05:00';
const J7_FIRST = '2026-09-04T20:00:00-05:00';

function j5(state: MatchState): Fixture[] {
  return [fx('j5-a', J5_EARLY, 5, state), fx('j5-b', J5_LAST, 5, state)];
}

function slate(j5State: MatchState, j6State: MatchState = 'pre'): Fixture[] {
  return [...j5(j5State), fx('j6-a', J6_FIRST, 6, j6State)];
}

describe('quinielaHoldThroughDay', () => {
  it('keeps the ranking through the Mexico day after the last kickoff', () => {
    assert.equal(quinielaHoldThroughDay(j5('post')), '2026-08-24');
  });
});

describe('pickQuinielaJornada', () => {
  it('ignores jornadas before QUINIELA_FROM (soft reset at J6)', () => {
    assert.equal(QUINIELA_FROM, 6);
    const mondayAfternoon = new Date('2026-08-24T16:53:00-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), mondayAfternoon), 6);
  });

  it('rolls to the next jornada after the hold day', () => {
    const tuesdayMexico = new Date('2026-08-25T00:00:01-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), tuesdayMexico), 6);
  });

  it('does not stay on a live jornada below QUINIELA_FROM', () => {
    const sundayNight = new Date('2026-08-23T21:30:00-05:00');
    const games = [
      fx('j5-a', J5_EARLY, 5, 'post'),
      fx('j5-b', J5_LAST, 5, 'in'),
      fx('j6-a', J6_FIRST, 6, 'pre'),
    ];
    assert.equal(pickQuinielaJornada(games, sundayNight), 6);
  });

  it('opens the next jornada on its match day even if a hold would overlap', () => {
    const friday = new Date('2026-08-28T12:00:00-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), friday), 6);
  });

  it('holds a sealed jornada (J6+) through the next Mexico day', () => {
    const monday = new Date('2026-08-31T16:00:00-06:00');
    const games = [
      fx('j6-a', J6_FIRST, 6, 'post'),
      fx('j6-b', J6_LAST, 6, 'post'),
      fx('j7-a', J7_FIRST, 7, 'pre'),
    ];
    assert.equal(pickQuinielaJornada(games, monday), 6);
    const tuesday = new Date('2026-09-01T00:00:01-06:00');
    assert.equal(pickQuinielaJornada(games, tuesday), 7);
  });

  it('opens Jornada 6 of the Apertura calendar once J5 is ignored', () => {
    const monday = new Date('2026-08-24T16:53:00-06:00');
    const fixtures = seedLigaMxFixtures().map((f) => {
      const end = +new Date(f.date) + 2 * 3600_000;
      const state: MatchState = end <= +monday ? 'post' : 'pre';
      return { ...f, state };
    });
    assert.equal(pickQuinielaJornada(fixtures, monday), 6);
    const tuesday = new Date('2026-08-25T00:30:00-06:00');
    assert.equal(pickQuinielaJornada(fixtures, tuesday), 6);
  });
});
