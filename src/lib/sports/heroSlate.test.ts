import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DayGame, GamesOfDayPayload } from './gamesOfDay';
import { seedGamesOfDay } from './gamesOfDay';
import { mergeJornadaIntoHeroSlate } from './heroSlate';
import type { JornadaOverview } from './jornada';
import type { Fixture } from './types';

function fx(
  id: string,
  date: string,
  league: Fixture['league'],
  jornada: string
): Fixture {
  return {
    id,
    provider: 'sportmonks',
    league,
    date,
    jornada,
    state: 'pre',
    statusLabel: 'Próximo',
    home: { id: 'h', name: 'Home', abbreviation: 'HOM' },
    away: { id: 'a', name: 'Away', abbreviation: 'AWY' },
  };
}

function asDay(f: Fixture): DayGame {
  return { ...f, phase: 'idle', radioAvailable: false, radioLabel: 'Cabina al inicio' };
}

function jornada(upcoming: Fixture[]): JornadaOverview {
  return {
    label: 'Jornada 6',
    number: 6,
    generatedAt: '2026-08-24T22:00:00.000Z',
    source: 'sportmonks',
    live: [],
    played: [],
    upcoming,
  };
}

function payload(games: Fixture[], dayKey: string): GamesOfDayPayload {
  return {
    dayKey,
    generatedAt: '2026-08-24T22:00:00.000Z',
    source: 'sportmonks',
    games: games.map(asDay),
    upcoming: true,
  };
}

/** Monday 24 Aug 2026, 5pm Mexico (no Liga MX today). */
const MONDAY = Date.parse('2026-08-24T17:00:00-06:00');
const LIGA_FRI = fx('atl-leo', '2026-08-28T20:00:00-05:00', 'liga-mx', 'Jornada 6');
const LC_TUE = fx('lc-qf-1', '2026-08-25T19:30:00-05:00', 'leagues-cup', 'Quarterfinals');
const LC_WED = fx('lc-qf-2', '2026-08-26T20:30:00-04:00', 'leagues-cup', 'Quarterfinals');

describe('mergeJornadaIntoHeroSlate', () => {
  it('prefers nearer Leagues Cup over the next Liga MX jornada', () => {
    const merged = mergeJornadaIntoHeroSlate(
      payload([LC_TUE, LC_WED], '2026-08-25'),
      jornada([LIGA_FRI]),
      MONDAY
    );
    assert.equal(merged?.dayKey, '2026-08-25');
    assert.equal(merged?.upcoming, true);
    assert.deepEqual(
      merged?.games.map((g) => g.id),
      ['lc-qf-1']
    );
  });

  it('keeps Liga MX when that jornada day is the soonest slate', () => {
    const friday = Date.parse('2026-08-28T12:00:00-06:00');
    const merged = mergeJornadaIntoHeroSlate(
      payload([LIGA_FRI], '2026-08-28'),
      jornada([LIGA_FRI]),
      friday
    );
    assert.equal(merged?.dayKey, '2026-08-28');
    assert.equal(merged?.upcoming, undefined);
    assert.deepEqual(
      merged?.games.map((g) => g.id),
      ['atl-leo']
    );
  });

  it('mixes Liga MX and Leagues Cup on the same day', () => {
    const sameDayLc = fx('lc-qf-x', '2026-08-28T22:00:00-05:00', 'leagues-cup', 'Quarterfinals');
    const friday = Date.parse('2026-08-28T12:00:00-06:00');
    const merged = mergeJornadaIntoHeroSlate(
      payload([LIGA_FRI, sameDayLc], '2026-08-28'),
      jornada([LIGA_FRI]),
      friday
    );
    assert.equal(merged?.dayKey, '2026-08-28');
    assert.deepEqual(
      merged?.games.map((g) => g.id).sort(),
      ['atl-leo', 'lc-qf-x']
    );
  });
});

describe('seedGamesOfDay', () => {
  it('surfaces Leagues Cup cuartos before the next Liga MX viernes', () => {
    const seed = seedGamesOfDay(new Date('2026-08-24T17:00:00-06:00'));
    assert.equal(seed.dayKey, '2026-08-25');
    assert.equal(seed.upcoming, true);
    assert.ok(seed.games.every((g) => g.league === 'leagues-cup'));
    assert.ok(seed.games.some((g) => g.id === 'lc-qf-1'));
    assert.ok(seed.games.some((g) => g.id === 'lc-qf-3'));
  });

  it('surfaces Leagues Cup semis on 2 sep after jornada 6', () => {
    const seed = seedGamesOfDay(new Date('2026-09-01T17:00:00-06:00'));
    assert.equal(seed.dayKey, '2026-09-02');
    assert.equal(seed.upcoming, true);
    assert.ok(seed.games.some((g) => g.id === 'lc-sf-1'));
    assert.ok(seed.games.some((g) => g.id === 'lc-sf-2'));
  });
});
