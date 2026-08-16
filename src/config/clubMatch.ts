import { LIGA_MX_CLUBS, type GravityClub } from '@/config/clubs';

/**
 * Pure gravity matching — shared by the client `GravityContext` and the
 * server-side push dispatcher so a subscription targets exactly the same
 * fixtures the in-app watcher would light up. No React / browser deps.
 */

export function clubById(clubId: string | null | undefined): GravityClub | null {
  if (!clubId) return null;
  return LIGA_MX_CLUBS.find((c) => c.id === clubId) ?? null;
}

export function clubNameHits(hay: string, club: GravityClub): boolean {
  const h = hay.toLowerCase();
  return (
    h.includes(club.name.toLowerCase()) ||
    h.includes(club.abbreviation.toLowerCase()) ||
    (club.id === 'chivas' && (h.includes('guadalajara') || h.includes('chivas'))) ||
    (club.id === 'america' && (h.includes('américa') || h.includes('america'))) ||
    (club.id === 'atlante' && h.includes('atlante')) ||
    (club.id === 'san-luis' && (h.includes('san luis') || h.includes('sanluis')))
  );
}

/** ESPN Apertura 2026 abbr (+ legacy aliases) for this gravity club. */
export function clubAbbrHits(abbr: string, club: GravityClub): boolean {
  const a = abbr.toUpperCase();
  if (a === club.abbreviation) return true;
  if (club.id === 'chivas' && (a === 'GDL' || a === 'CHI' || a === 'GUA')) return true;
  if (club.id === 'san-luis' && (a === 'ASL' || a === 'SLP')) return true;
  if (club.id === 'necaxa' && (a === 'NCX' || a === 'NEC' || a === 'NXA')) return true;
  if (club.id === 'pumas' && (a === 'UNAM' || a === 'PUM')) return true;
  if (club.id === 'tigres' && (a === 'UANL' || a === 'TIG' || a === 'TUA')) return true;
  if (club.id === 'atlas' && a === 'ATS') return true;
  if (club.id === 'atlante' && (a === 'ATL' || a === 'ALT')) return true;
  if (club.id === 'santos' && (a === 'SAN' || a === 'SLA')) return true;
  if (club.id === 'monterrey' && (a === 'MTY' || a === 'MNT')) return true;
  if (club.id === 'pachuca' && (a === 'PAC' || a === 'PCH')) return true;
  return false;
}

/** True when a fixture is "gravity" for a given selection (club and/or El Tri). */
export function gravityMatches(
  club: GravityClub | null,
  elTri: boolean,
  homeName: string,
  awayName: string,
  homeAbbr = '',
  awayAbbr = ''
): boolean {
  if (elTri) {
    const blob = `${homeName} ${awayName} ${homeAbbr} ${awayAbbr}`.toLowerCase();
    if (blob.includes('mexic') || homeAbbr === 'MEX' || awayAbbr === 'MEX') return true;
  }
  if (!club) return false;
  return (
    clubNameHits(homeName, club) ||
    clubNameHits(awayName, club) ||
    clubAbbrHits(homeAbbr, club) ||
    clubAbbrHits(awayAbbr, club)
  );
}
