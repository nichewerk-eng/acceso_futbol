import { EL_TRI, LIGA_MX_CLUBS, type GravityClub } from '@/config/clubs';

export type ClubPalette = {
  /** Hero plane */
  ink: string;
  /** Accent on ink */
  signal: string;
  /** Paper text on ink when signal is light */
  onInk: string;
};

export type ClubIdentity = GravityClub & {
  smTeamId: number | null;
  nicknames: string[];
  /** Reddit search query within r/LigaMX */
  redditQuery: string;
  /** Story / social match needles (lowercase-friendly) */
  matchHints: RegExp;
  palette: ClubPalette;
  /** Acceso line when no Moment is pinned */
  weatherLine: string;
};

const PALETTE: Record<string, ClubPalette> = {
  america: { ink: '#0c0c0c', signal: '#f0c419', onInk: '#f6f5f2' },
  chivas: { ink: '#6e0b1a', signal: '#f6f5f2', onInk: '#f6f5f2' },
  'cruz-azul': { ink: '#0a2a6b', signal: '#e8f0ff', onInk: '#f6f5f2' },
  tigres: { ink: '#0c0c0c', signal: '#f0a800', onInk: '#f6f5f2' },
  monterrey: { ink: '#0c1a2e', signal: '#7eb8e8', onInk: '#f6f5f2' },
  pumas: { ink: '#1a1a1a', signal: '#c4a35a', onInk: '#f6f5f2' },
  toluca: { ink: '#5c0a12', signal: '#f6f5f2', onInk: '#f6f5f2' },
  atlas: { ink: '#5c0a12', signal: '#f0c419', onInk: '#f6f5f2' },
  santos: { ink: '#0c2e1a', signal: '#7dff9a', onInk: '#f6f5f2' },
  leon: { ink: '#0c2e1a', signal: '#f0c419', onInk: '#f6f5f2' },
  pachuca: { ink: '#0a2a4a', signal: '#f6f5f2', onInk: '#f6f5f2' },
  tijuana: { ink: '#0c0c0c', signal: '#e05a0c', onInk: '#f6f5f2' },
  necaxa: { ink: '#5c0a12', signal: '#f6f5f2', onInk: '#f6f5f2' },
  puebla: { ink: '#0a2a6b', signal: '#f6f5f2', onInk: '#f6f5f2' },
  queretaro: { ink: '#0c0c0c', signal: '#f6f5f2', onInk: '#f6f5f2' },
  'san-luis': { ink: '#5c0a12', signal: '#f0c419', onInk: '#f6f5f2' },
  juarez: { ink: '#0c0c0c', signal: '#6ec8ff', onInk: '#f6f5f2' },
  atlante: { ink: '#7a0019', signal: '#3d7cff', onInk: '#f6f5f2' },
  'el-tri': { ink: '#0c2e1a', signal: '#f0c419', onInk: '#f6f5f2' },
};

/** Sportmonks team ids — mirrors ligaMxTeams.ts */
const SM_ID: Record<string, number> = {
  chivas: 427,
  queretaro: 538,
  tigres: 609,
  atlas: 680,
  toluca: 967,
  'cruz-azul': 2626,
  monterrey: 2662,
  america: 2687,
  santos: 2844,
  pumas: 2989,
  puebla: 3849,
  necaxa: 3951,
  juarez: 6335,
  atlante: 7023,
  pachuca: 10036,
  leon: 10836,
  tijuana: 11023,
  'san-luis': 15522,
};

const NICKS: Record<string, string[]> = {
  america: ['águilas', 'aguilas', 'americanistas'],
  chivas: ['rebaño', 'rebano', 'rojiblancos'],
  'cruz-azul': ['máquina', 'maquina', 'cementeros'],
  tigres: ['felinos', 'uanl'],
  monterrey: ['rayados'],
  pumas: ['universitarios', 'unam'],
  toluca: ['diablos'],
  atlas: ['rojinegros'],
  santos: ['guerreros', 'laguna'],
  leon: ['fiera'],
  pachuca: ['tuzos'],
  tijuana: ['xolos'],
  necaxa: ['rayos'],
  puebla: ['la franja'],
  queretaro: ['gallos'],
  'san-luis': ['atletico'],
  juarez: ['bravos'],
  atlante: ['potros'],
  'el-tri': ['selección', 'seleccion', 'méxico', 'mexico'],
};

const REDDIT_Q: Record<string, string> = {
  america: 'América OR Aguilas OR Águilas',
  chivas: 'Chivas OR Guadalajara OR Rebaño',
  'cruz-azul': 'Cruz Azul OR Máquina OR Maquina',
  tigres: 'Tigres OR UANL',
  monterrey: 'Monterrey OR Rayados',
  pumas: 'Pumas OR UNAM',
  toluca: 'Toluca OR Diablos',
  atlas: 'Atlas',
  santos: 'Santos Laguna OR Santos',
  leon: 'León OR Leon OR Fiera',
  pachuca: 'Pachuca OR Tuzos',
  tijuana: 'Tijuana OR Xolos',
  necaxa: 'Necaxa',
  puebla: 'Puebla',
  queretaro: 'Querétaro OR Queretaro OR Gallos',
  'san-luis': 'San Luis OR Atlético San Luis',
  juarez: 'Juárez OR Juarez OR Bravos',
  atlante: 'Atlante',
  'el-tri': 'El Tri OR Selección OR Mexico OR México',
};

const HINTS: Record<string, RegExp> = {
  america: /\bam[eé]rica\b|\b[aá]guilas\b/i,
  chivas: /\bchivas\b|\bguadalajara\b|\breba[nñ]o\b/i,
  'cruz-azul': /cruz\s*azul|\bm[aá]quina\b/i,
  tigres: /\btigres\b|\buanl\b|\bfelino/i,
  monterrey: /\bmonterrey\b|\brayados\b/i,
  pumas: /\bpumas\b|\bunam\b/i,
  toluca: /\btoluca\b|\bdiablos?\b/i,
  atlas: /\batlas\b/i,
  santos: /\bsantos\b/i,
  leon: /\ble[oó]n\b|\bfiera\b/i,
  pachuca: /\bpachuca\b|\btuzos\b/i,
  tijuana: /\btijuana\b|\bxolos\b/i,
  necaxa: /\bnecaxa\b/i,
  puebla: /\bpuebla\b/i,
  queretaro: /quer[eé]taro|\bgallos\b/i,
  'san-luis': /san\s*luis|\batl[eé]tico\s*san\s*luis/i,
  juarez: /ju[aá]rez|\bbravos\b/i,
  atlante: /\batlante\b|\bpotros?\b/i,
  'el-tri': /selecci[oó]n|\bel\s*tri\b|\bm[eé]xico\b/i,
};

const WEATHER: Record<string, string> = {
  america: 'Las Águilas no piden permiso. Aquí vive su noche.',
  chivas: 'El Rebaño no se explica. Se siente.',
  'cruz-azul': 'La Máquina sigue. La sala también.',
  tigres: 'Felinos al acecho. Acceso en la grada.',
  monterrey: 'Rayados: frío en la mesa, calor en el feed.',
  pumas: 'CU late aquí — no en el resumen de noticias.',
  toluca: 'Diablos en rojo. Sin anestesia.',
  atlas: 'Rojinegro: drama incluido en el precio.',
  santos: 'Laguna late. Nosotros traducimos.',
  leon: 'La Fiera no pide contexto. Lo impone.',
  pachuca: 'Tuzos: cantera, ritmo, urgencia.',
  tijuana: 'Xolos en la frontera — el puente es el producto.',
  necaxa: 'Rayos. Cortos, eléctricos, sin filtro.',
  puebla: 'La Franja pide volumen. Se lo damos.',
  queretaro: 'Gallos: pelea cada jornada como final.',
  'san-luis': 'Atlético: subir o sufrir. Aquí se cuenta.',
  juarez: 'Bravos en la línea. MX ↔ US sin subtítulos.',
  atlante: 'Potros de vuelta. Memoria y hambre.',
  'el-tri': 'El Tri no es un club. Es el país en la cancha.',
};

function build(club: GravityClub): ClubIdentity {
  return {
    ...club,
    smTeamId: SM_ID[club.id] ?? null,
    nicknames: NICKS[club.id] ?? [],
    redditQuery: REDDIT_Q[club.id] ?? club.name,
    matchHints: HINTS[club.id] ?? new RegExp(club.name, 'i'),
    palette: PALETTE[club.id] ?? {
      ink: '#0c0c0c',
      signal: '#e05a0c',
      onInk: '#f6f5f2',
    },
    weatherLine: WEATHER[club.id] ?? `${club.name}. Tu sala en Acceso.`,
  };
}

const ALL: ClubIdentity[] = [...LIGA_MX_CLUBS.map(build), build(EL_TRI)];

const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export function allClubIdentities(): ClubIdentity[] {
  return ALL;
}

export function getClubIdentity(slug: string | null | undefined): ClubIdentity | null {
  if (!slug) return null;
  return BY_ID.get(slug.trim().toLowerCase()) ?? null;
}

export function clubIdentityFromAbbr(abbr: string | null | undefined): ClubIdentity | null {
  if (!abbr) return null;
  const a = abbr.trim().toUpperCase();
  return (
    ALL.find((c) => c.abbreviation === a) ??
    ALL.find((c) => {
      // SM / legacy aliases via logo map patterns
      if (c.id === 'chivas' && (a === 'GDL' || a === 'CHI' || a === 'GUA')) return true;
      if (c.id === 'necaxa' && (a === 'NCX' || a === 'NEC' || a === 'NXA')) return true;
      if (c.id === 'pumas' && (a === 'UNAM' || a === 'PUM')) return true;
      if (c.id === 'tigres' && (a === 'UANL' || a === 'TIG' || a === 'TUA')) return true;
      if (c.id === 'santos' && (a === 'SAN' || a === 'SLA')) return true;
      if (c.id === 'monterrey' && (a === 'MTY' || a === 'MNT')) return true;
      if (c.id === 'pachuca' && (a === 'PAC' || a === 'PCH')) return true;
      if (c.id === 'queretaro' && (a === 'QRO' || a === 'QUE')) return true;
      if (c.id === 'san-luis' && (a === 'ASL' || a === 'SLP')) return true;
      if (c.id === 'atlante' && (a === 'ATL' || a === 'ALT')) return true;
      if (c.id === 'el-tri' && (a === 'MEX' || a === 'TRI')) return true;
      return false;
    }) ??
    null
  );
}

export function textMentionsClub(text: string, club: ClubIdentity): boolean {
  return club.matchHints.test(text);
}
