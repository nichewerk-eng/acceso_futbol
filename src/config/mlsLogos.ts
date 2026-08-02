/** Local MLS crests for Leagues Cup — /public/mls_logos. Prefer SM team id over abbr. */

const LOGO_DIR = '/mls_logos';

const BY_SM_ID: Record<string, string> = {
  '254172': `${LOGO_DIR}/austin.png`,
  '260119': `${LOGO_DIR}/charlotte.png`,
  '75': `${LOGO_DIR}/chicago-fire.png`,
  '3636': `${LOGO_DIR}/cincinnati.png`,
  '577': `${LOGO_DIR}/columbus-crew.png`,
  '583': `${LOGO_DIR}/fc-dallas.png`,
  '239235': `${LOGO_DIR}/inter-miami.png`,
  '147671': `${LOGO_DIR}/lafc.png`,
  '3639': `${LOGO_DIR}/minnesota-united.png`,
  '148048': `${LOGO_DIR}/nashville-sc.png`,
  '3627': `${LOGO_DIR}/nycfc.png`,
  '204': `${LOGO_DIR}/orlando-city.png`,
  '275': `${LOGO_DIR}/philadelphia-union.png`,
  '607': `${LOGO_DIR}/portland-timbers.png`,
  '1062': `${LOGO_DIR}/real-salt-lake.png`,
  '275650': `${LOGO_DIR}/san-diego-fc.png`,
  '2649': `${LOGO_DIR}/seattle-sounders.png`,
  '292': `${LOGO_DIR}/vancouver-whitecaps.png`,
};

/** Non-colliding Sportmonks short codes (omit CHI — clashes with Chivas ESPN abbr). */
const ABBR_TO_PATH: Record<string, string> = {
  ATX: BY_SM_ID['254172'],
  CHL: BY_SM_ID['260119'],
  CIN: BY_SM_ID['3636'],
  COL: BY_SM_ID['577'],
  DAL: BY_SM_ID['583'],
  MIA: BY_SM_ID['239235'],
  LAF: BY_SM_ID['147671'],
  LAFC: BY_SM_ID['147671'],
  MIN: BY_SM_ID['3639'],
  NSH: BY_SM_ID['148048'],
  NYC: BY_SM_ID['3627'],
  ORL: BY_SM_ID['204'],
  PHI: BY_SM_ID['275'],
  POT: BY_SM_ID['607'],
  POR: BY_SM_ID['607'],
  RSL: BY_SM_ID['1062'],
  SDL: BY_SM_ID['275650'],
  SD: BY_SM_ID['275650'],
  SEA: BY_SM_ID['2649'],
  VAN: BY_SM_ID['292'],
};

export function mlsLogoSrc(abbrOrSmId?: string | null): string | null {
  if (!abbrOrSmId) return null;
  const raw = abbrOrSmId.trim();
  if (BY_SM_ID[raw]) return BY_SM_ID[raw];
  return ABBR_TO_PATH[raw.toUpperCase()] ?? null;
}
