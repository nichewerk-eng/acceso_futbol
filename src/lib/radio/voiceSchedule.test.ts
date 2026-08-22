import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateBriefSlotAt, playableBriefSlotAt } from './voiceSchedule';

describe('voiceSchedule', () => {
  it('plays and generates the morning cut at 8:00', () => {
    assert.deepEqual(playableBriefSlotAt('2026-08-22', 8), { dayKey: '2026-08-22', slot: 'am' });
    assert.deepEqual(generateBriefSlotAt('2026-08-22', 8), { dayKey: '2026-08-22', slot: 'am' });
  });

  it('plays and generates the evening cut at 18:00', () => {
    assert.deepEqual(playableBriefSlotAt('2026-08-21', 18), { dayKey: '2026-08-21', slot: 'pm' });
    assert.deepEqual(generateBriefSlotAt('2026-08-21', 18), { dayKey: '2026-08-21', slot: 'pm' });
  });

  it('does not generate at midday; still plays the morning cut', () => {
    assert.deepEqual(playableBriefSlotAt('2026-08-22', 13), { dayKey: '2026-08-22', slot: 'am' });
    assert.equal(generateBriefSlotAt('2026-08-22', 13), null);
  });

  it('is silent after 1:00; desk keeps last evening’s cut', () => {
    assert.deepEqual(playableBriefSlotAt('2026-08-23', 2), { dayKey: '2026-08-22', slot: 'pm' });
    assert.equal(generateBriefSlotAt('2026-08-23', 2), null);
  });

  it('still generates if the morning cron runs late', () => {
    assert.deepEqual(generateBriefSlotAt('2026-08-22', 10), { dayKey: '2026-08-22', slot: 'am' });
    assert.deepEqual(playableBriefSlotAt('2026-08-22', 10), { dayKey: '2026-08-22', slot: 'am' });
  });
});
