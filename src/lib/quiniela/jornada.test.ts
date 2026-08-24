import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from '../sports/espnFallback';
import type { Fixture, MatchState } from '../sports/types';
import {
  pickQuinielaJornada,
  quinielaHoldThroughDay,
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
/** J6 first kickoff: Friday 28 Aug 2026, 8pm Mexico. */
const J6_FIRST = '2026-08-28T20:00:00-05:00';

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
  it('stays on a sealed jornada the day after the last game', () => {
    const mondayAfternoon = new Date('2026-08-24T16:53:00-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), mondayAfternoon), 5);
  });

  it('rolls to the next jornada after that full day', () => {
    const tuesdayMexico = new Date('2026-08-25T00:00:01-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), tuesdayMexico), 6);
  });

  it('does not roll while the last match is still live', () => {
    const sundayNight = new Date('2026-08-23T21:30:00-05:00');
    const games = [
      fx('j5-a', J5_EARLY, 5, 'post'),
      fx('j5-b', J5_LAST, 5, 'in'),
      fx('j6-a', J6_FIRST, 6, 'pre'),
    ];
    assert.equal(pickQuinielaJornada(games, sundayNight), 5);
  });

  it('stays on an in-progress jornada with remaining games', () => {
    const saturday = new Date('2026-08-22T21:00:00-05:00');
    const games = [
      fx('j5-a', J5_EARLY, 5, 'post'),
      fx('j5-b', J5_LAST, 5, 'pre'),
      fx('j6-a', J6_FIRST, 6, 'pre'),
    ];
    assert.equal(pickQuinielaJornada(games, saturday), 5);
  });

  it('opens the next jornada on its match day even if a hold would overlap', () => {
    const friday = new Date('2026-08-28T12:00:00-06:00');
    assert.equal(pickQuinielaJornada(slate('post'), friday), 6);
  });

  it('holds Jornada 5 of the Apertura calendar through Monday 24 Aug', () => {
    const monday = new Date('2026-08-24T16:53:00-06:00');
    const fixtures = seedLigaMxFixtures().map((f) => {
      const end = +new Date(f.date) + 2 * 3600_000;
      const state: MatchState = end <= +monday ? 'post' : 'pre';
      return { ...f, state };
    });
    assert.equal(pickQuinielaJornada(fixtures, monday), 5);
    const tuesday = new Date('2026-08-25T00:30:00-06:00');
    assert.equal(pickQuinielaJornada(fixtures, tuesday), 6);
  });
});
