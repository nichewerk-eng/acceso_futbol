import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seedLigaMxFixtures } from './espnFallback';
import { seedGamesOfDay } from './gamesOfDay';
import { overlayShouldReplaceSeedSchedule } from './scheduleHold';
import { mergeLigaMxSchedule } from './mergeLigaMxSchedule';
import {
  jornadaFechaCluster,
  jornadaNumber,
  seedJornadaOverview,
} from './jornada';

const LC_MAKEUPS = [
  ['PUE', 'TOL'],
  ['QRO', 'MTY'],
  ['AME', 'TIJ'],
  ['UNAM', 'LEO'],
] as const;

function pair(f: { home: { abbreviation: string }; away: { abbreviation: string } }) {
  return `${f.home.abbreviation}-${f.away.abbreviation}`;
}

describe('J7 Leagues Cup makeups', () => {
  it('keeps the four LC pairs on their new dates, off this weekend', () => {
    const j7 = seedLigaMxFixtures().filter((f) => jornadaNumber(f.jornada) === 7);
    assert.equal(j7.length, 9);
    const core = jornadaFechaCluster(j7);
    assert.equal(core.length, 5);
    assert.deepEqual(
      core.map(pair).sort(),
      ['ASL-GDL', 'ATS-ATL', 'CAZ-SAN', 'JUA-PAC', 'UANL-NCX']
    );
    for (const [home, away] of LC_MAKEUPS) {
      const f = j7.find((x) => x.home.abbreviation === home && x.away.abbreviation === away);
      assert.ok(f);
      assert.ok(!/aplaz/i.test(f.statusLabel ?? ''));
      assert.ok(!core.some((c) => c.id === f.id), `${home}-${away} stayed on the fecha`);
    }
  });

  it('does not list the makeups on the J7 board', () => {
    const overview = seedJornadaOverview(new Date('2026-09-03T12:00:00-05:00'));
    assert.equal(overview?.number, 7);
    const ids = [...overview!.upcoming, ...overview!.played, ...(overview!.postponed ?? [])].map(
      pair
    );
    assert.equal(ids.length, 5);
    for (const [home, away] of LC_MAKEUPS) {
      assert.ok(!ids.includes(`${home}-${away}`));
    }
    assert.equal(overview?.postponed.length, 0);
  });

  it('does not put makeup pairs on the next Liga MX viernes', () => {
    const seed = seedGamesOfDay(new Date('2026-09-03T12:00:00-05:00'));
    assert.equal(seed.dayKey, '2026-09-04');
    assert.ok(seed.games.some((g) => g.home.abbreviation === 'JUA' && g.away.abbreviation === 'PAC'));
    assert.ok(
      !seed.games.some((g) => g.home.abbreviation === 'PUE' && g.away.abbreviation === 'TOL')
    );
  });

  it('lets Sportmonks keep a later Mexico day on a makeup pair', () => {
    const seed = seedLigaMxFixtures().find(
      (f) => f.home.abbreviation === 'AME' && f.away.abbreviation === 'TIJ'
    );
    assert.ok(seed);
    const live = [
      {
        ...seed,
        date: '2026-10-28T22:00:00-06:00',
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
    assert.equal(ameTij?.date, '2026-10-28T22:00:00-06:00');
  });
});

describe('jornadaFechaCluster', () => {
  it('keeps a midweek + weekend jornada together (J2)', () => {
    const j2 = seedLigaMxFixtures().filter((f) => jornadaNumber(f.jornada) === 2);
    assert.equal(jornadaFechaCluster(j2).length, j2.length);
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

  it('does not let an older postpone pull a later scheduled seed back', () => {
    assert.equal(
      overlayShouldReplaceSeedSchedule(
        { date: '2026-09-15T20:00:00-05:00', statusLabel: 'Por jugar' },
        {
          date: '2026-09-04T20:00:00-05:00',
          state: 'pre',
          statusLabel: 'Aplazado',
        }
      ),
      false
    );
  });
});
