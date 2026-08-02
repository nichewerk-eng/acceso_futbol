import { LIGA_MX_CLUBS } from '@/config/clubs';
import { scheduleAbbr } from './ligaMxAbbr';

/**
 * Sportmonks team ids for Liga MX clubs that appear in domestic + Leagues Cup.
 * Used to keep cup boards Acceso-relevant (MX-involved only).
 */
export const LIGA_MX_SM_TEAM_IDS = new Set<number>([
  427, // Guadalajara
  538, // Querétaro
  609, // Tigres UANL
  680, // Atlas
  967, // Toluca
  2626, // Cruz Azul
  2662, // Monterrey
  2687, // América
  2844, // Santos Laguna
  2989, // Pumas UNAM
  3849, // Puebla
  3951, // Necaxa
  6335, // Juárez
  7023, // Atlante
  10036, // Pachuca
  10836, // León
  11023, // Tijuana
  15522, // Atlético San Luis
  247689, // Mazatlán
]);

const LIGA_MX_ABBRS = new Set(LIGA_MX_CLUBS.map((c) => scheduleAbbr(c.abbreviation)));

export function isLigaMxSmTeamId(id: string | number | null | undefined): boolean {
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) && LIGA_MX_SM_TEAM_IDS.has(n);
}

export function isLigaMxClubAbbr(abbr: string | null | undefined): boolean {
  if (!abbr) return false;
  return LIGA_MX_ABBRS.has(scheduleAbbr(abbr));
}

/** True when a cup (or other) fixture involves at least one Liga MX club. */
export function involvesLigaMxClub(home: {
  id?: string;
  abbreviation?: string;
}, away: { id?: string; abbreviation?: string }): boolean {
  return (
    isLigaMxSmTeamId(home.id) ||
    isLigaMxSmTeamId(away.id) ||
    isLigaMxClubAbbr(home.abbreviation) ||
    isLigaMxClubAbbr(away.abbreviation)
  );
}
