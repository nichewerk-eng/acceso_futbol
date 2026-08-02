import type { Fixture, MatchSnapshot } from '@/lib/sports';

export type RadioPhase = 'idle' | 'preshow' | 'live' | 'recap';

const PRESHOW_MINUTES = 15;

/** Calendar day in Mexico City (Liga MX / El Tri local day). */
export function mexicoDayKey(d = new Date()): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
}

export function isMexicoDay(iso: string, dayKey = mexicoDayKey()): boolean {
  try {
    return (
      new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) === dayKey
    );
  } catch {
    return false;
  }
}

export function minutesUntilKick(iso: string, now = Date.now()): number {
  return (+new Date(iso) - now) / 60_000;
}

export function hasCommentary(match: Pick<MatchSnapshot, 'comments' | 'events'>): boolean {
  return (match.comments?.length ?? 0) > 0 || (match.events?.length ?? 0) > 0;
}

/**
 * Radio product phase for a fixture.
 * - live: match in progress (AF Radio companion)
 * - preshow: within 15m of kickoff, still pre
 * - recap: finished (podcast recap when commentary/stats exist)
 * - idle: scheduled later today / outside window
 */
export function radioPhase(fixture: Fixture, now = Date.now()): RadioPhase {
  if (fixture.state === 'in') return 'live';
  if (fixture.state === 'post') return 'recap';
  if (fixture.state === 'pre') {
    const mins = minutesUntilKick(fixture.date, now);
    if (mins <= PRESHOW_MINUTES && mins > -2) return 'preshow';
  }
  return 'idle';
}

export function radioPhaseLabel(phase: RadioPhase): string {
  switch (phase) {
    case 'live':
      return 'AF Radio en vivo';
    case 'preshow':
      return 'Pre-show';
    case 'recap':
      return 'Recap podcast';
    default:
      return 'Próximo';
  }
}

/** League path for match / radio URLs. */
export function leaguePath(league: Fixture['league']): string {
  if (league === 'seleccion') return 'seleccion';
  if (league === 'liga-mx' || league === 'liga-mx-femenil') return 'liga-mx';
  return 'liga-mx';
}
