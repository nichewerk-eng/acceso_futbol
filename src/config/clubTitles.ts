/**
 * Club honours — professional era only (1943–).
 * Amateur Copas / ligas before Liga Mayor are out of this cabinet.
 *
 * National: FMF/Liga MX palmarés (updated 25 Jul 2026 after Cruz Azul
 * Clausura 2026 + Campeón de Campeones 2026).
 * International: Wikipedia «Títulos oficiales de clubes del fútbol mexicano»
 * (aval CONCACAF / CONMEBOL / FIFA; corte 25 jul 2026). Excludes SuperLiga,
 * Campeones Cup and Leagues Cup.
 */

export type NationalComp = 'liga' | 'copa' | 'cdc' | 'supercopa';
export type InternationalComp =
  | 'concacaf'
  | 'interamericana'
  | 'gigantes'
  | 'recopa'
  | 'sudamericana'
  | 'fifa-derbi'
  | 'fifa-challenger';
export type TitleComp = NationalComp | InternationalComp;

export type NationalWin = {
  name: string;
  label: string;
};

export type TrophyShelf = {
  comp: TitleComp;
  title: string;
  logo: string;
  wins: NationalWin[];
};

export type ClubCabinet = {
  clubId: string;
  total: number;
  shelves: TrophyShelf[];
};

const LOGOS: Record<NationalComp, string> = {
  liga: '/trophy_logos/liga_mx_trophy.png',
  copa: '/trophy_logos/copa_mx_cup.png',
  cdc: '/trophy_logos/campeon_de_campones.png',
  supercopa: '/trophy_logos/super_copa.png',
};

const TITLES: Record<NationalComp, string> = {
  liga: 'Liga MX',
  copa: 'Copa MX',
  cdc: 'Campeón de Campeones',
  supercopa: 'Supercopa',
};

const SHELF_ORDER: NationalComp[] = ['liga', 'copa', 'cdc', 'supercopa'];

const INT_LOGOS: Record<InternationalComp, string> = {
  concacaf: '/trophy_logos/concacaf_champions_cup.png',
  interamericana: '/trophy_logos/copa_interamericana.png',
  gigantes: '/trophy_logos/copa_gigantes_concacaf.png',
  recopa: '/trophy_logos/recopa_concacaf.png',
  sudamericana: '/trophy_logos/copa_sudamericana.png',
  'fifa-derbi': '/trophy_logos/fifa_intercontinental.png',
  'fifa-challenger': '/trophy_logos/fifa_intercontinental.png',
};

const INT_TITLES: Record<InternationalComp, string> = {
  concacaf: 'Copa de Campeones',
  interamericana: 'Copa Interamericana',
  gigantes: 'Copa de Gigantes',
  recopa: 'Recopa CONCACAF',
  sudamericana: 'Copa Sudamericana',
  'fifa-derbi': 'Derbi de las Américas',
  'fifa-challenger': 'Copa Challenger',
};

const INT_SHELF_ORDER: InternationalComp[] = [
  'concacaf',
  'interamericana',
  'gigantes',
  'recopa',
  'sudamericana',
  'fifa-derbi',
  'fifa-challenger',
];

/** Season / year strings as Mexican press writes them. */
type ClubWins = Partial<Record<NationalComp, string[]>>;

const WINS: Record<string, ClubWins> = {
  america: {
    liga: [
      '1965-66',
      '1970-71',
      '1975-76',
      '1983-84',
      '1984-85',
      'Prode 1985',
      '1987-88',
      '1988-89',
      'Verano 2002',
      'Clausura 2005',
      'Clausura 2013',
      'Apertura 2014',
      'Apertura 2018',
      'Apertura 2023',
      'Clausura 2024',
      'Apertura 2024',
    ],
    copa: ['1953-54', '1954-55', '1963-64', '1964-65', '1973-74', 'Clausura 2019'],
    cdc: ['1955', '1976', '1988', '1989', '2005', '2019', '2024'],
    supercopa: ['Supercopa de la Liga MX 2024'],
  },
  chivas: {
    liga: [
      '1956-57',
      '1958-59',
      '1959-60',
      '1960-61',
      '1961-62',
      '1963-64',
      '1964-65',
      '1969-70',
      '1986-87',
      'Verano 1997',
      'Apertura 2006',
      'Clausura 2017',
    ],
    copa: ['1962-63', '1969-70', 'Apertura 2015', 'Clausura 2017'],
    cdc: ['1957', '1959', '1960', '1961', '1964', '1965', '1970'],
    supercopa: ['Supercopa MX 2016'],
  },
  'cruz-azul': {
    liga: [
      '1968-69',
      'México 1970',
      '1971-72',
      '1972-73',
      '1973-74',
      '1978-79',
      '1979-80',
      'Invierno 1997',
      'Guardianes 2021',
      'Clausura 2026',
    ],
    copa: ['1968-69', '1996-97', 'Clausura 2013', 'Apertura 2018'],
    cdc: ['1969', '1974', '2021', '2026'],
    supercopa: ['Supercopa MX 2019', 'Supercopa de la Liga MX 2022'],
  },
  toluca: {
    liga: [
      '1966-67',
      '1967-68',
      '1974-75',
      'Verano 1998',
      'Verano 1999',
      'Verano 2000',
      'Apertura 2002',
      'Apertura 2005',
      'Apertura 2008',
      'Bicentenario 2010',
      'Clausura 2025',
      'Apertura 2025',
    ],
    copa: ['1955-56', '1988-89'],
    cdc: ['1967', '1968', '2003', '2006', '2025'],
  },
  leon: {
    liga: [
      '1947-48',
      '1948-49',
      '1951-52',
      '1955-56',
      '1991-92',
      'Apertura 2013',
      'Clausura 2014',
      'Guardianes 2020',
    ],
    copa: ['1948-49', '1957-58', '1966-67', '1970-71', '1971-72'],
    cdc: ['1948', '1949', '1956', '1971', '1972'],
  },
  tigres: {
    liga: [
      '1977-78',
      '1981-82',
      'Apertura 2011',
      'Apertura 2015',
      'Apertura 2016',
      'Apertura 2017',
      'Clausura 2019',
      'Clausura 2023',
    ],
    copa: ['1975-76', '1995-96', 'Clausura 2014'],
    cdc: ['2016', '2017', '2018', '2023'],
  },
  pumas: {
    liga: [
      '1976-77',
      '1980-81',
      '1990-91',
      'Clausura 2004',
      'Apertura 2004',
      'Clausura 2009',
      'Clausura 2011',
    ],
    copa: ['1974-75'],
    cdc: ['1975', '2004'],
  },
  monterrey: {
    liga: ['México 1986', 'Clausura 2003', 'Apertura 2009', 'Apertura 2010', 'Apertura 2019'],
    copa: ['1991-92', 'Apertura 2017', '2019-20'],
  },
  necaxa: {
    liga: ['1994-95', '1995-96', 'Invierno 1998'],
    copa: ['1959-60', '1965-66', '1994-95', 'Clausura 2018'],
    cdc: ['1966', '1995'],
    supercopa: ['Supercopa MX 2018'],
  },
  atlas: {
    liga: ['1950-51', 'Apertura 2021', 'Clausura 2022'],
    copa: ['1945-46', '1949-50', '1961-62', '1967-68'],
    cdc: ['1946', '1950', '1951', '1962', '2022'],
  },
  puebla: {
    liga: ['1982-83', '1989-90'],
    copa: ['1944-45', '1952-53', '1987-88', '1989-90', 'Clausura 2015'],
    cdc: ['1990'],
    supercopa: ['Supercopa MX 2015'],
  },
  santos: {
    liga: [
      'Invierno 1996',
      'Verano 2001',
      'Clausura 2008',
      'Clausura 2012',
      'Clausura 2015',
      'Clausura 2018',
    ],
    copa: ['Apertura 2014'],
    cdc: ['2015'],
  },
  pachuca: {
    liga: [
      'Invierno 1999',
      'Invierno 2001',
      'Apertura 2003',
      'Clausura 2006',
      'Clausura 2007',
      'Clausura 2016',
      'Apertura 2022',
    ],
  },
  atlante: {
    liga: ['1946-47', '1992-93', 'Apertura 2007'],
    copa: ['1950-51', '1951-52'],
    cdc: ['1952'],
  },
  tijuana: {
    liga: ['Apertura 2012'],
  },
  queretaro: {
    copa: ['Apertura 2016'],
    supercopa: ['Supercopa MX 2017'],
  },
};

type IntClubWins = Partial<Record<InternationalComp, string[]>>;

const INT_WINS: Record<string, IntClubWins> = {
  america: {
    concacaf: ['1977', '1987', '1990', '1992', '2006', '2014-15', '2015-16'],
    interamericana: ['1978', '1991'],
    gigantes: ['2001'],
  },
  'cruz-azul': {
    concacaf: ['1969', '1970', '1971', '1996', '1997', '2013-14', '2025'],
  },
  chivas: {
    concacaf: ['1962', '2018'],
  },
  toluca: {
    concacaf: ['1968', '2003', '2026'],
  },
  leon: {
    concacaf: ['2023'],
  },
  tigres: {
    concacaf: ['2020'],
  },
  pumas: {
    concacaf: ['1980', '1982', '1989'],
    interamericana: ['1981'],
  },
  monterrey: {
    concacaf: ['2010-11', '2011-12', '2012-13', '2019', '2021'],
    recopa: ['1992-93'],
  },
  necaxa: {
    concacaf: ['1999'],
    recopa: ['1993-94'],
  },
  puebla: {
    concacaf: ['1991'],
  },
  pachuca: {
    concacaf: ['2002', '2007', '2008', '2009-10', '2016-17', '2024'],
    sudamericana: ['2006'],
    'fifa-derbi': ['2024'],
    'fifa-challenger': ['2024'],
  },
  atlante: {
    concacaf: ['1983', '2008-09'],
  },
};

function yy(year: string): string {
  return year.slice(2);
}

export function shortTorneoLabel(name: string, comp: TitleComp): string {
  const ape = name.match(/^Apertura (\d{4})$/i);
  if (ape) return `A${yy(ape[1])}`;
  const cla = name.match(/^Clausura (\d{4})$/i);
  if (cla) return `C${yy(cla[1])}`;
  const ver = name.match(/^Verano (\d{4})$/i);
  if (ver) return `V${yy(ver[1])}`;
  const inv = name.match(/^Invierno (\d{4})$/i);
  if (inv) return `I${yy(inv[1])}`;
  const prode = name.match(/^Prode (\d{4})$/i);
  if (prode) return `Prode ${yy(prode[1])}`;
  const mex = name.match(/^M[ée]xico (\d{4})$/i);
  if (mex) return `Méx ${yy(mex[1])}`;
  const bic = name.match(/^Bicentenario (\d{4})$/i);
  if (bic) return `Bic ${yy(bic[1])}`;
  const gua = name.match(/^Guardianes (\d{4})$/i);
  if (gua) return `G${yy(gua[1])}`;
  const long = name.match(/^(\d{4})-(\d{2})$/);
  if (long) return `${yy(long[1])}-${long[2]}`;
  if (
    (comp === 'cdc' ||
      comp === 'concacaf' ||
      comp === 'interamericana' ||
      comp === 'gigantes' ||
      comp === 'recopa' ||
      comp === 'sudamericana' ||
      comp === 'fifa-derbi' ||
      comp === 'fifa-challenger') &&
    /^\d{4}$/.test(name)
  ) {
    return name;
  }
  const sc = name.match(/(\d{4})\s*$/);
  if (comp === 'supercopa' && sc) return sc[1];
  return name;
}

function displayName(name: string, comp: TitleComp): string {
  if (comp === 'cdc' && /^\d{4}$/.test(name)) return `Campeón de Campeones ${name}`;
  if (comp === 'concacaf') return `Copa de Campeones ${name}`;
  if (comp === 'interamericana') return `Copa Interamericana ${name}`;
  if (comp === 'gigantes') return `Copa de Gigantes ${name}`;
  if (comp === 'recopa') return `Recopa CONCACAF ${name}`;
  if (comp === 'sudamericana') return `Copa Sudamericana ${name}`;
  if (comp === 'fifa-derbi') return `Derbi de las Américas ${name}`;
  if (comp === 'fifa-challenger') return `Copa Challenger ${name}`;
  return name;
}

function cabinetFromWins<C extends TitleComp>(
  clubId: string,
  raw: Partial<Record<C, string[]>> | undefined,
  order: readonly C[],
  titles: Record<C, string>,
  logos: Record<C, string>
): ClubCabinet | null {
  if (!raw) return null;
  const shelves: TrophyShelf[] = [];
  for (const comp of order) {
    const list = raw[comp];
    if (!list || list.length === 0) continue;
    shelves.push({
      comp,
      title: titles[comp],
      logo: logos[comp],
      wins: list.map((name) => ({
        name: displayName(name, comp),
        label: shortTorneoLabel(name, comp),
      })),
    });
  }
  const total = shelves.reduce((n, s) => n + s.wins.length, 0);
  if (total === 0) return null;
  return { clubId, total, shelves };
}

export function nationalTitlesFor(clubId: string): ClubCabinet | null {
  return cabinetFromWins(clubId, WINS[clubId], SHELF_ORDER, TITLES, LOGOS);
}

export function internationalTitlesFor(clubId: string): ClubCabinet | null {
  return cabinetFromWins(clubId, INT_WINS[clubId], INT_SHELF_ORDER, INT_TITLES, INT_LOGOS);
}
