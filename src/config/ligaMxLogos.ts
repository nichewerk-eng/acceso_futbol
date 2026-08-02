/** Local crests in /public/liga_mx_logos — Apertura 2026 (Atlante in, no Mazatlán). */

const LOGO_DIR = '/liga_mx_logos';

const BY_ID: Record<string, string> = {
  america: `${LOGO_DIR}/america_logo.svg`,
  atlante: `${LOGO_DIR}/atlante_logo.svg`,
  atlas: `${LOGO_DIR}/atlas_logo.svg`,
  chivas: `${LOGO_DIR}/chivas_logo.svg`,
  'cruz-azul': `${LOGO_DIR}/cruz_azul_logo.svg`,
  juarez: `${LOGO_DIR}/juarez_logo.svg`,
  leon: `${LOGO_DIR}/leon_logo.svg`,
  monterrey: `${LOGO_DIR}/monterrey_logo.svg`,
  necaxa: `${LOGO_DIR}/necaxa_logo.svg`,
  pachuca: `${LOGO_DIR}/pachuca_logo.svg`,
  puebla: `${LOGO_DIR}/puebla_logo.svg`,
  pumas: `${LOGO_DIR}/pumas_logo.svg`,
  queretaro: `${LOGO_DIR}/queretaro_logo.svg`,
  'san-luis': `${LOGO_DIR}/san_luis_logo.svg`,
  santos: `${LOGO_DIR}/santos_logo.svg`,
  tigres: `${LOGO_DIR}/tigres_logo.svg`,
  tijuana: `${LOGO_DIR}/tijuana_logo.svg`,
  toluca: `${LOGO_DIR}/toluca_logo.svg`,
};

/** ESPN Apertura 2026 abbreviations (+ a few legacy aliases). */
const ABBR_TO_ID: Record<string, string> = {
  AME: 'america',
  ATL: 'atlante',
  ATS: 'atlas',
  GDL: 'chivas',
  CHI: 'chivas',
  CAZ: 'cruz-azul',
  JUA: 'juarez',
  LEO: 'leon',
  MTY: 'monterrey',
  NCX: 'necaxa',
  NEC: 'necaxa',
  PAC: 'pachuca',
  PUE: 'puebla',
  UNAM: 'pumas',
  PUM: 'pumas',
  QRO: 'queretaro',
  ASL: 'san-luis',
  SLP: 'san-luis',
  SAN: 'santos',
  UANL: 'tigres',
  TIG: 'tigres',
  TIJ: 'tijuana',
  TOL: 'toluca',
  // legacy static Atlante code
  ALT: 'atlante',
};

export function ligaMxClubIdFromAbbr(abbr?: string | null): string | null {
  if (!abbr) return null;
  return ABBR_TO_ID[abbr.trim().toUpperCase()] ?? null;
}

export function ligaMxLogoSrc(abbrOrId?: string | null): string | null {
  if (!abbrOrId) return null;
  const raw = abbrOrId.trim();
  if (BY_ID[raw]) return BY_ID[raw];
  const fromAbbr = ligaMxClubIdFromAbbr(raw);
  return fromAbbr ? BY_ID[fromAbbr] ?? null : null;
}

export function ligaMxLeagueLogoSrc(): string {
  return `${LOGO_DIR}/liga_mx_logo.svg`;
}
