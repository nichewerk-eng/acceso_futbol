import type { LigaMXEntry } from '@/app/api/ligamx/standings/route';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';

/** Season W-D-L from the live tabla (e.g. 6-3-4). */
export function recordFromTabla(
  tabla: LigaMXEntry[] | null | undefined,
  abbr: string
): string | null {
  if (!tabla?.length) return null;
  const want = scheduleAbbr(abbr);
  const entry = tabla.find((e) => scheduleAbbr(e.team.abbreviation) === want);
  if (!entry) return null;
  return `${entry.w}-${entry.d}-${entry.l}`;
}
