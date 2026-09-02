import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from './espnFallback';
import { seedGamesOfDay } from './gamesOfDay';
import { overlayShouldReplaceSeedSchedule } from './scheduleHold';
import { mergeLigaMxSchedule } from './mergeLigaMxSchedule';
import { jornadaNumber } from './jornada';

describe('J7 Leagues Cup postponements', () => {
  it('marks the four LC-affected J7 pairs as Aplazado on the static board', () => {
    const j7 = seedLigaMxFixtures().filter((f) => jornadaNumber(f.jornada) === 7);
    const held = j7
      .filter((f) => f.statusLabel === 'Aplazado')
      .map((f) => `${f.home.abbreviation}-${f.away.abbreviation}`)
      .sort();
    assert.deepEqual(held, ['AME-TIJ', 'PUE-TOL', 'QRO-MTY', 'UNAM-LEO']);
    assert.equal(j7.length, 9);
    assert.equal(
      j7.filter((f) => f.statusLabel !== 'Aplazado').length,
      5
    );
  });

  it('keeps a stale Sportmonks NS overlay from putting them back on this weekend', () => {
    const seed = seedLigaMxFixtures().find(
      (f) => f.home.abbreviation === 'PUE' && f.away.abbreviation === 'TOL'
    );
    assert.ok(seed);
    const live = [
      {
        ...seed,
        id: seed.id,
        date: seed.date,
        jornada: seed.jornada,
        status: {
          completed: false,
          state: 'pre',
          description: 'Not Started',
          shortDetail: 'Próximo',
          displayClock: '',
        },
        home: { name: seed.home.name, abbreviation: seed.home.abbreviation, score: null },
        away: { name: seed.away.name, abbreviation: seed.away.abbreviation, score: null },
      },
    ];
    const merged = mergeLigaMxSchedule(live);
    const pueTol = merged.find(
      (f) => f.home.abbreviation === 'PUE' && f.away.abbreviation === 'TOL'
    );
    assert.equal(pueTol?.status.shortDetail, 'Aplazado');
    assert.equal(pueTol?.date, seed.date);
  });

  it('lets Sportmonks win once it actually moves the Mexico day', () => {
    const seed = seedLigaMxFixtures().find(
      (f) => f.home.abbreviation === 'AME' && f.away.abbreviation === 'TIJ'
    );
    assert.ok(seed);
    const live = [
      {
        ...seed,
        date: '2026-09-16T20:00:00-05:00',
        status: {
          completed: false,
          state: 'pre',
          description: 'Not Started',
          shortDetail: 'Próximo',
          displayClock: '',
        },
        home: { name: seed.home.name, abbreviation: seed.home.abbreviation, score: null },
        away: { name: seed.away.name, abbreviation: seed.away.abbreviation, score: null },
      },
    ];
    const merged = mergeLigaMxSchedule(live);
    const ameTij = merged.find(
      (f) => f.home.abbreviation === 'AME' && f.away.abbreviation === 'TIJ'
    );
    assert.equal(ameTij?.status.shortDetail, 'Próximo');
    assert.equal(ameTij?.date, '2026-09-16T20:00:00-05:00');
  });
});

describe('seedGamesOfDay after LC semis', () => {
  it('does not put postponed J7 pairs on the next Liga MX viernes', () => {
    const seed = seedGamesOfDay(new Date('2026-09-03T12:00:00-05:00'));
    assert.equal(seed.dayKey, '2026-09-04');
    assert.ok(seed.games.some((g) => g.home.abbreviation === 'JUA' && g.away.abbreviation === 'PAC'));
    assert.ok(
      !seed.games.some((g) => g.home.abbreviation === 'PUE' && g.away.abbreviation === 'TOL')
    );
  });
});

describe('overlayShouldReplaceSeedSchedule', () => {
  const seed = {
    date: '2026-09-04T20:00:00-05:00',
    statusLabel: 'Aplazado',
  };

  it('rejects same-day NS', () => {
    assert.equal(
      overlayShouldReplaceSeedSchedule(seed, {
        date: seed.date,
        state: 'pre',
        statusLabel: 'Próximo',
      }),
      false
    );
  });

  it('accepts overlay postpone / FT / a new Mexico day', () => {
    assert.equal(
      overlayShouldReplaceSeedSchedule(seed, {
        date: seed.date,
        state: 'pre',
        statusLabel: 'Aplazado',
      }),
      true
    );
    assert.equal(
      overlayShouldReplaceSeedSchedule(seed, {
        date: seed.date,
        state: 'post',
        statusLabel: 'Final',
      }),
      true
    );
    assert.equal(
      overlayShouldReplaceSeedSchedule(seed, {
        date: '2026-09-16T20:00:00-05:00',
        state: 'pre',
        statusLabel: 'Próximo',
      }),
      true
    );
  });
});
