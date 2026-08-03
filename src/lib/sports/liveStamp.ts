import type { Fixture } from './types';

/** Compact live stamp for score cards: HT · 67' · ET 105' · PEN · LIVE */
export function liveStamp(f: Pick<Fixture, 'state' | 'clock' | 'statusLabel'>): string {
  if (f.state !== 'in') return f.state === 'post' ? 'FT' : '';
  const clock = f.clock?.trim();
  if (clock) {
    if (clock === 'HT' || /^HT$/i.test(clock)) return 'HT';
    if (clock === 'PEN' || /^PEN/i.test(clock)) return 'PEN';
    return clock;
  }
  if (/descanso|half\s*time|\bht\b/i.test(f.statusLabel ?? '')) return 'HT';
  if (/penal/i.test(f.statusLabel ?? '')) return 'PEN';
  if (/extra|et\b/i.test(f.statusLabel ?? '')) return 'ET';
  return 'LIVE';
}

export function liveStampLabel(f: Pick<Fixture, 'state' | 'clock' | 'statusLabel'>): string {
  const stamp = liveStamp(f);
  if (f.state !== 'in') return stamp;
  if (stamp === 'HT') return 'Descanso';
  if (stamp === 'PEN') return 'Penales';
  if (stamp === 'ET' || stamp.startsWith('ET ')) return stamp === 'ET' ? 'Tiempo extra' : stamp;
  if (stamp === 'LIVE') return 'En vivo';
  return `En vivo · ${stamp}`;
}
