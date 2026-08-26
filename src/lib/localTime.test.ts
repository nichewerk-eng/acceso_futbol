import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatKickoffDay,
  formatKickoffFull,
  formatKickoffTime,
} from './localTime';

/** América vs Columbus · Leagues Cup 2026 QF at Dignity Health Sports Park. */
const KICK = '2026-08-27T02:45:00.000Z';

describe('local kickoff clocks', () => {
  it('prints the same instant in the viewer timezone, not venue or UTC', () => {
    assert.equal(formatKickoffTime(KICK, 'America/Los_Angeles'), '7:45 p.m.');
    assert.equal(formatKickoffTime(KICK, 'America/Chicago'), '9:45 p.m.');
    assert.equal(formatKickoffTime(KICK, 'America/Mexico_City'), '8:45 p.m.');
    assert.equal(formatKickoffTime(KICK, 'UTC'), '2:45 a.m.');
  });

  it('keeps the calendar day in the viewer zone', () => {
    assert.equal(formatKickoffDay(KICK, 'America/Chicago'), 'miércoles, 26 de agosto');
    assert.equal(formatKickoffDay(KICK, 'UTC'), 'jueves, 27 de agosto');
  });

  it('does not leak UTC into a full label', () => {
    assert.equal(
      formatKickoffFull(KICK, 'America/Chicago'),
      'miércoles, 26 de agosto de 2026, 9:45 p.m.'
    );
    assert.notEqual(formatKickoffFull(KICK, 'America/Chicago').includes('2:45'), true);
  });
});
