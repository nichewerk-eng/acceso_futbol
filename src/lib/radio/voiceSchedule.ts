import { mexicoDayKey, mexicoHour, shiftDayKey } from '@/lib/radio/phases';

export type NewsBriefSlot = 'am' | 'pm';

export type BriefSlotRef = { dayKey: string; slot: NewsBriefSlot };

/**
 * Starter = 40_000 ElevenLabs credits / month (flash ≈ 0.25 credits/char).
 *
 * Toma: at most one cut per cron tick, ~2–4 cuts per jornada weekend.
 *   ~5 fechas × 4 cuts × ~400 credits ≈ 8_000 / month.
 * NEWS: two stored MP3s / day (08:00 and 18:00 Mexico), ~350 words / ~530 cap.
 *   2 × 30 × ~450 ≈ 27_000 / month.
 * Overnight 01:00–07:59 is silent. No per-listen TTS.
 */
export const VOICE_CREDIT_BUDGET = {
  monthly: 40_000,
  tomaReserve: 10_000,
  briefPerDay: 2,
} as const;

/** Generate today's AM cut. 07–11 covers DST + a late cron. */
const AM_GEN_HOURS = new Set([7, 8, 9, 10, 11]);
/** Generate today's PM cut at 18:00. 17–20 covers DST + a late cron. */
const PM_GEN_HOURS = new Set([17, 18, 19, 20]);

export function briefStoreKey(dayKey: string, slot: NewsBriefSlot): string {
  return `news-brief-${dayKey}-${slot}`;
}

export function playableBriefSlotAt(dayKey: string, hour: number): BriefSlotRef {
  if (hour >= 8 && hour < 18) return { dayKey, slot: 'am' };
  if (hour >= 18) return { dayKey, slot: 'pm' };
  return { dayKey: shiftDayKey(dayKey, -1), slot: 'pm' };
}

export function generateBriefSlotAt(dayKey: string, hour: number): BriefSlotRef | null {
  if (AM_GEN_HOURS.has(hour)) return { dayKey, slot: 'am' };
  if (PM_GEN_HOURS.has(hour)) return { dayKey, slot: 'pm' };
  return null;
}

/** Which cut the desk should play right now. */
export function playableBriefSlot(now = Date.now()): BriefSlotRef {
  const d = new Date(now);
  return playableBriefSlotAt(mexicoDayKey(d), mexicoHour(d));
}

/**
 * Slot this cron tick may write. Null outside the morning/evening windows
 * (no generation 01:00–06:59 or 12:00–16:00).
 */
export function generateBriefSlot(now = Date.now()): BriefSlotRef | null {
  const d = new Date(now);
  return generateBriefSlotAt(mexicoDayKey(d), mexicoHour(d));
}

export function briefDeskTitle(slot: NewsBriefSlot): string {
  return slot === 'am' ? 'Briefing de la mañana' : 'Briefing de la tarde';
}
