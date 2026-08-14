import { LIGA_MX_CLUBS } from '@/config/clubs';
import { scheduleAbbr } from './ligaMxAbbr';

/**
 * Sportmonks team ids for Liga MX clubs that appear in domestic + Leagues Cup.
 * Used to keep cup boards Acceso-relevant (MX-involved only).
 */
export const LIGA_MX_SM_TEAM_BY_ABBR: Record<string, number> = {
  GDL: 427,
  QRO: 538,
  UANL: 609,
  ATS: 680,
  TOL: 967,
  CAZ: 2626,
  MTY: 2662,
  AME: 2687,
  SAN: 2844,
  UNAM: 2989,
  PUE: 3849,
  NCX: 3951,
  JUA: 6335,
  ATL: 7023,
  PAC: 10036,
  LEO: 10836,
  TIJ: 11023,
  ASL: 15522,
};

export const LIGA_MX_SM_TEAM_IDS = new Set<number>([
  ...Object.values(LIGA_MX_SM_TEAM_BY_ABBR),
  247689, // Mazatlán
]);

export function smTeamIdFromAbbr(abbr: string | null | undefined): string | null {
  if (!abbr) return null;
  const id = LIGA_MX_SM_TEAM_BY_ABBR[scheduleAbbr(abbr)];
  return id != null ? String(id) : null;
}

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
