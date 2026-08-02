import { mexicoDayKey } from '@/lib/radio/phases';

/**
 * Normalize Sportmonks / ESPN / legacy codes → schedule / logo codes
 * used in static Apertura calendar and UI.
 */
const TO_SCHEDULE: Record<string, string> = {
  // Sportmonks short_codes
  SLA: 'SAN',
  NXA: 'NCX',
  MNT: 'MTY',
  PUM: 'UNAM',
  TUA: 'UANL',
  GUA: 'GDL',
  PCH: 'PAC',
  QUE: 'QRO',
  // ESPN / static legacy
  NEC: 'NCX',
  TIG: 'UANL',
  SLP: 'ASL',
  ALT: 'ATL',
  CHI: 'GDL',
};

export function scheduleAbbr(abbr: string): string {
  const a = abbr.trim().toUpperCase();
  return TO_SCHEDULE[a] ?? a;
}

/** Mexico-City day + home|away abbrs (order matters). */
export function dayPairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  return `${mexicoDayKey(new Date(dateIso))}|${scheduleAbbr(homeAbbr)}|${scheduleAbbr(awayAbbr)}`;
}
