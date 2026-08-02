/** Local crests — Liga MX in /public/liga_mx_logos, El Tri in /public/seleccion_logo. */

const LOGO_DIR = '/liga_mx_logos';
const SELECCION_DIR = '/seleccion_logo';

const BY_ID: Record<string, string> = {
  america: `${LOGO_DIR}/club-america-logo.png`,
  atlante: `${LOGO_DIR}/atlante-logo.png`,
  atlas: `${LOGO_DIR}/atlas-logo.png`,
  chivas: `${LOGO_DIR}/cd-guadalajara-logo.png`,
  'cruz-azul': `${LOGO_DIR}/cruz-azul-logo.png`,
  juarez: `${LOGO_DIR}/fc-juarez-logo.png`,
  leon: `${LOGO_DIR}/club-leon-logo.png`,
  monterrey: `${LOGO_DIR}/monterrey-logo.png`,
  necaxa: `${LOGO_DIR}/necaxa-logo.png`,
  pachuca: `${LOGO_DIR}/pachuca-logo.png`,
  puebla: `${LOGO_DIR}/puebla-logo.png`,
  pumas: `${LOGO_DIR}/pumas-unam-logo.png`,
  queretaro: `${LOGO_DIR}/queretaro-fc-logo.png`,
  'san-luis': `${LOGO_DIR}/atletico-san-luis.png`,
  santos: `${LOGO_DIR}/santos-laguna-logo.png`,
  tigres: `${LOGO_DIR}/tigres-uanl-logo.png`,
  tijuana: `${LOGO_DIR}/club-tijuana-logo.png`,
  toluca: `${LOGO_DIR}/toluca-logo.png`,
  // Present on disk but not in Apertura 2026 gravity set
  mazatlan: `${LOGO_DIR}/mazatlan-fc-logo.png`,
  'el-tri': `${SELECCION_DIR}/mexico-national-team-logo.png`,
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
  NXA: 'necaxa', // Sportmonks
  NEC: 'necaxa',
  PAC: 'pachuca',
  PCH: 'pachuca', // Sportmonks
  PUE: 'puebla',
  UNAM: 'pumas',
  PUM: 'pumas',
  QRO: 'queretaro',
  QUE: 'queretaro', // Sportmonks
  ASL: 'san-luis',
  SLP: 'san-luis',
  SAN: 'santos',
  SLA: 'santos', // Sportmonks Santos Laguna
  UANL: 'tigres',
  TIG: 'tigres',
  TUA: 'tigres', // Sportmonks
  TIJ: 'tijuana',
  TOL: 'toluca',
  MNT: 'monterrey', // Sportmonks
  GUA: 'chivas', // Sportmonks Guadalajara
  MAZ: 'mazatlan',
  MEX: 'el-tri',
  TRI: 'el-tri',
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
  return `${LOGO_DIR}/liga-mx-logo.png`;
}
