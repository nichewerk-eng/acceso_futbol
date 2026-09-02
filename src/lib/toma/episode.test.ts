import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { JornadaOverview } from '../sports/jornada';
import type { Fixture, MatchState } from '../sports/types';
import { closedDaySlate, closedDaySlates, closedJornadaSlate, preJornadaSlate } from './episode';

const SETTLE_MS = 100 * 60_000;

function fx(id: string, date: string, state: MatchState): Fixture {
  return {
    id,
    provider: 'sportmonks',
    league: 'liga-mx',
    date,
    jornada: 'Jornada 5',
    state,
    statusLabel: state === 'post' ? 'Final' : 'Próximo',
    home: { id: 'h', name: 'Home', abbreviation: 'HOM' },
    away: { id: 'a', name: 'Away', abbreviation: 'AWY' },
  };
}

function overview(played: Fixture[], upcoming: Fixture[] = []): JornadaOverview {
  return {
    label: 'Jornada 5',
    number: 5,
    generatedAt: '2026-08-22T13:00:00.000Z',
    source: 'sportmonks',
    live: [],
    played,
    upcoming,
    postponed: [],
  };
}

/** J5 viernes night in Mexico (UTC-5 in August). */
const FRI_KICK = '2026-08-22T03:10:00Z';
const SAT_KICK = '2026-08-23T01:00:00Z';
/** Saturday 00:20 Mexico — cron tick after viernes settle. */
const SAT_CRON = Date.parse('2026-08-22T06:20:00Z');
/** Saturday 08:39 Mexico — desk still showing the J5 previa. */
const SAT_MORNING = Date.parse('2026-08-22T13:39:00Z');

describe('closedDaySlate', () => {
  it('returns viernes after midnight Saturday even if sábado is still pre', () => {
    const j = overview(
      [fx('fri-1', '2026-08-22T01:00:00Z', 'post'), fx('fri-2', FRI_KICK, 'post')],
      [fx('sat-1', SAT_KICK, 'pre')]
    );

    assert.equal(closedDaySlate(j, SAT_CRON)?.dayKey, '2026-08-21');
    assert.equal(closedDaySlate(j, SAT_MORNING)?.dayKey, '2026-08-21');
    assert.deepEqual(
      closedDaySlates(j, SAT_MORNING).map((d) => d.dayKey),
      ['2026-08-21']
    );
  });

  it('waits for the settle window after the last kick', () => {
    const j = overview([fx('fri-1', FRI_KICK, 'post')]);
    const tooSoon = Date.parse(FRI_KICK) + SETTLE_MS - 1;
    const ready = Date.parse(FRI_KICK) + SETTLE_MS;
    assert.equal(closedDaySlate(j, tooSoon), null);
    assert.equal(closedDaySlate(j, ready)?.dayKey, '2026-08-21');
  });

  it('returns sábado once that day is settled, keeping viernes in the list', () => {
    const satLast = '2026-08-23T03:00:00Z';
    const j = overview(
      [
        fx('fri-1', FRI_KICK, 'post'),
        fx('sat-1', SAT_KICK, 'post'),
        fx('sat-2', satLast, 'post'),
      ],
      [fx('sun-1', '2026-08-24T01:00:00Z', 'pre')]
    );
    const sundayMorning = Date.parse('2026-08-23T13:00:00Z');
    assert.equal(closedDaySlate(j, sundayMorning)?.dayKey, '2026-08-22');
    assert.deepEqual(
      closedDaySlates(j, sundayMorning).map((d) => d.dayKey),
      ['2026-08-21', '2026-08-22']
    );
  });
});

describe('preJornadaSlate / closedJornadaSlate', () => {
  it('is previa only before the first kick and with nothing played', () => {
    const first = '2026-08-22T01:00:00Z';
    const j = overview([], [fx('fri-1', first, 'pre')]);
    assert.equal(preJornadaSlate(j, Date.parse(first) - 1)?.dayKey, 'antes');
    assert.equal(preJornadaSlate(j, Date.parse(first)), null);
  });

  it('does not treat a mid-fecha Saturday as cierre', () => {
    const j = overview(
      [fx('fri-1', FRI_KICK, 'post')],
      [fx('sat-1', SAT_KICK, 'pre')]
    );
    assert.equal(closedJornadaSlate(j, SAT_MORNING), null);
  });
});
