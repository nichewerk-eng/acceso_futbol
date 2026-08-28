import type { TvChannelId } from '@/config/dondeVer';

/** Official Leagues Cup wordmark — white mark on black (`/public/mls_logos/lc_logo.png`). */
export const LEAGUES_CUP_LOGO = '/mls_logos/lc_logo.png';

/**
 * Official Leagues Cup 2026 Phase One + knockout tree.
 * Sportmonks often has wrong venues / home-away; this board is source of truth for schedule UI.
 * `smId` links to Sportmonks for live scores when available.
 */

export type LcKick = {
  /** Sportmonks fixture id */
  smId: number;
  /** Calendar day on the official Leagues Cup board */
  boardDate: string;
  /** Local kickoff at the venue (24h) */
  localTime: string;
  /** IANA tz of the venue */
  tz: string;
  venue: string;
  /** First team on the official board (display home) */
  home: string;
  /** Second team on the official board (display away) */
  away: string;
  /**
   * US listings from LeaguesCup.com (always includes Apple TV).
   * MX defaults to Apple TV; set `mx` when Imagen TV (or others) also carry the match.
   */
  us: TvChannelId[];
  /** MX linear / streaming extras (defaults to Apple TV only). */
  mx?: TvChannelId[];
};

export type LcKnockoutSlot = {
  id: string;
  /** Sportmonks fixture id when the KO tie exists in their season dump. */
  smId?: number;
  stage: 'Quarterfinals' | 'Semifinals' | 'Third Place Match' | 'Final';
  boardDate: string | null;
  boardDateLabel: string;
  /** Club abbr when the side is set; null = TBD (use homeLabel). */
  home: string | null;
  away: string | null;
  homeLabel: string;
  awayLabel: string;
  homeSeed?: string;
  awaySeed?: string;
  venueLabel: string;
  /** Venue-local kickoff when announced (24h). */
  localTime?: string;
  tz?: string;
  us?: TvChannelId[];
  mx?: TvChannelId[];
  /** Slot ids whose winners (or losers, for third place) feed this match. */
  feedsFrom?: [string, string];
};

/** Convert venue-local wall time → UTC ISO. */
export function lcLocalToIso(boardDate: string, localTime: string, tz: string): string {
  const [y, m, d] = boardDate.split('-').map(Number);
  const [hh, mm] = localTime.split(':').map(Number);
  let t = Date.UTC(y, m - 1, d, hh, mm, 0);
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(new Date(t))
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, p.value])
    ) as Record<string, string>;
    const asUtc = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour === 24 ? 0 : +parts.hour,
      +parts.minute,
      +parts.second
    );
    const desired = Date.UTC(y, m - 1, d, hh, mm, 0);
    t += desired - asUtc;
  }
  return new Date(t).toISOString();
}

const ET = 'America/New_York';
const CT = 'America/Chicago';
const MT = 'America/Denver';
const PT = 'America/Los_Angeles';
const MX = 'America/Mexico_City';
const VAN = 'America/Vancouver';

/** US board shortcuts — order matches LeaguesCup.com listings. */
const TV = ['apple-tv'] as TvChannelId[];
const TV_FS1 = ['apple-tv', 'fs1'] as TvChannelId[];
const TV_QF_US = ['apple-tv', 'tudn', 'fs1'] as TvChannelId[];
/** MX: Apple TV + Imagen TV select grid */
const MX_IMAGEN = ['apple-tv', 'imagen-tv'] as TvChannelId[];
const MX_QF_TELE = ['apple-tv', 'televisa', 'imagen-tv'] as TvChannelId[];

/** All 54 Phase One matches — Aug 4–13, 2026 (official board + US TV from LeaguesCup.com). */
export const LEAGUES_CUP_PHASE_ONE: LcKick[] = [
  // 8/4
  { smId: 19687332, boardDate: '2026-08-04', localTime: '18:45', tz: ET, venue: 'ScottsMiracle-Gro Field', home: 'COL', away: 'ATS', us: TV },
  { smId: 19687331, boardDate: '2026-08-04', localTime: '18:45', tz: ET, venue: 'TQL Stadium', home: 'CIN', away: 'PAC', us: TV_FS1 },
  { smId: 19687330, boardDate: '2026-08-04', localTime: '19:00', tz: ET, venue: 'Bank of America Stadium', home: 'CHL', away: 'UNAM', us: TV, mx: MX_IMAGEN },
  { smId: 19687329, boardDate: '2026-08-04', localTime: '19:30', tz: CT, venue: 'Allianz Field', home: 'MIN', away: 'JUA', us: TV },
  { smId: 19687328, boardDate: '2026-08-04', localTime: '21:00', tz: MT, venue: 'America First Field', home: 'UANL', away: 'RSL', us: TV_FS1 },
  { smId: 19687327, boardDate: '2026-08-04', localTime: '19:30', tz: VAN, venue: 'BC Place', home: 'VAN', away: 'ATL', us: TV },
  // 8/5
  { smId: 19687326, boardDate: '2026-08-05', localTime: '18:30', tz: ET, venue: 'Nu Stadium', home: 'MIA', away: 'ASL', us: TV },
  { smId: 19687325, boardDate: '2026-08-05', localTime: '18:30', tz: ET, venue: 'Inter.co Stadium', home: 'MTY', away: 'ORL', us: TV },
  { smId: 19687324, boardDate: '2026-08-05', localTime: '19:30', tz: CT, venue: 'GEODIS Park', home: 'NSH', away: 'LEO', us: TV },
  { smId: 19687323, boardDate: '2026-08-05', localTime: '19:30', tz: CT, venue: 'Mansfield Stadium', home: 'DAL', away: 'QRO', us: TV },
  { smId: 19687321, boardDate: '2026-08-05', localTime: '21:00', tz: MX, venue: 'Estadio Nemesio Díez', home: 'TOL', away: 'SEA', us: TV_FS1, mx: MX_IMAGEN },
  { smId: 19687322, boardDate: '2026-08-05', localTime: '21:30', tz: PT, venue: 'BMO Stadium', home: 'LAFC', away: 'GDL', us: TV },
  // 8/6
  { smId: 19687320, boardDate: '2026-08-06', localTime: '18:30', tz: ET, venue: 'Sports Illustrated Stadium', home: 'NYC', away: 'SAN', us: TV },
  { smId: 19687319, boardDate: '2026-08-06', localTime: '19:00', tz: ET, venue: 'Subaru Park', home: 'CAZ', away: 'PHI', us: TV_FS1 },
  { smId: 19687318, boardDate: '2026-08-06', localTime: '19:30', tz: CT, venue: 'SeatGeek Stadium', home: 'CHI', away: 'NCX', us: TV },
  { smId: 19687317, boardDate: '2026-08-06', localTime: '20:00', tz: CT, venue: 'Q2 Stadium', home: 'ATX', away: 'TIJ', us: TV },
  { smId: 19687333, boardDate: '2026-08-06', localTime: '21:00', tz: MX, venue: 'Estadio Banorte', home: 'AME', away: 'SDL', us: TV, mx: MX_IMAGEN },
  { smId: 19687316, boardDate: '2026-08-06', localTime: '21:30', tz: PT, venue: 'Providence Park', home: 'POR', away: 'PUE', us: TV },
  // 8/7
  { smId: 19687315, boardDate: '2026-08-07', localTime: '18:30', tz: ET, venue: 'Bank of America Stadium', home: 'CHL', away: 'ATS', us: TV },
  { smId: 19687314, boardDate: '2026-08-07', localTime: '18:30', tz: ET, venue: 'ScottsMiracle-Gro Field', home: 'COL', away: 'PAC', us: TV },
  { smId: 19687313, boardDate: '2026-08-07', localTime: '19:00', tz: ET, venue: 'TQL Stadium', home: 'CIN', away: 'UNAM', us: TV, mx: MX_IMAGEN },
  { smId: 19687312, boardDate: '2026-08-07', localTime: '20:00', tz: CT, venue: 'Allianz Field', home: 'UANL', away: 'MIN', us: TV },
  { smId: 19687311, boardDate: '2026-08-07', localTime: '19:30', tz: VAN, venue: 'BC Place', home: 'VAN', away: 'JUA', us: TV },
  // 8/8
  { smId: 19687310, boardDate: '2026-08-08', localTime: '17:30', tz: ET, venue: 'Inter.co Stadium', home: 'ORL', away: 'LEO', us: TV, mx: MX_IMAGEN },
  { smId: 19687309, boardDate: '2026-08-08', localTime: '19:00', tz: ET, venue: 'Nu Stadium', home: 'MIA', away: 'MTY', us: TV },
  { smId: 19687308, boardDate: '2026-08-08', localTime: '20:00', tz: PT, venue: 'PayPal Park', home: 'GDL', away: 'DAL', us: TV_FS1, mx: MX_IMAGEN },
  { smId: 19687307, boardDate: '2026-08-08', localTime: '21:00', tz: MT, venue: 'America First Field', home: 'RSL', away: 'ATL', us: TV },
  { smId: 19687306, boardDate: '2026-08-08', localTime: '22:10', tz: PT, venue: 'BMO Stadium', home: 'TOL', away: 'LAFC', us: TV_FS1 },
  // 8/9
  { smId: 19687305, boardDate: '2026-08-09', localTime: '14:30', tz: PT, venue: 'Lumen Field', home: 'SEA', away: 'QRO', us: TV },
  { smId: 19687303, boardDate: '2026-08-09', localTime: '18:30', tz: ET, venue: 'Subaru Park', home: 'PHI', away: 'NCX', us: TV },
  { smId: 19687304, boardDate: '2026-08-09', localTime: '18:30', tz: ET, venue: 'Sports Illustrated Stadium', home: 'CAZ', away: 'NYC', us: TV_FS1, mx: MX_IMAGEN },
  { smId: 19687302, boardDate: '2026-08-09', localTime: '19:00', tz: CT, venue: 'SeatGeek Stadium', home: 'CHI', away: 'SAN', us: TV },
  { smId: 19687301, boardDate: '2026-08-09', localTime: '19:00', tz: CT, venue: 'GEODIS Park', home: 'NSH', away: 'ASL', us: TV },
  { smId: 19687300, boardDate: '2026-08-09', localTime: '20:00', tz: CT, venue: 'Q2 Stadium', home: 'ATX', away: 'PUE', us: TV },
  { smId: 19687298, boardDate: '2026-08-09', localTime: '21:00', tz: PT, venue: 'Snapdragon Stadium', home: 'SDL', away: 'TIJ', us: TV },
  { smId: 19687299, boardDate: '2026-08-09', localTime: '21:15', tz: PT, venue: 'Providence Park', home: 'AME', away: 'POR', us: TV_FS1, mx: MX_IMAGEN },
  // 8/11
  { smId: 19687297, boardDate: '2026-08-11', localTime: '18:30', tz: ET, venue: 'ScottsMiracle-Gro Field', home: 'COL', away: 'UNAM', us: TV },
  { smId: 19687296, boardDate: '2026-08-11', localTime: '18:30', tz: ET, venue: 'Bank of America Stadium', home: 'CHL', away: 'PAC', us: TV },
  { smId: 19687295, boardDate: '2026-08-11', localTime: '19:00', tz: ET, venue: 'TQL Stadium', home: 'CIN', away: 'ATS', us: TV_FS1 },
  { smId: 19687294, boardDate: '2026-08-11', localTime: '19:30', tz: CT, venue: 'Allianz Field', home: 'MIN', away: 'ATL', us: TV },
  { smId: 19687293, boardDate: '2026-08-11', localTime: '20:30', tz: MT, venue: 'America First Field', home: 'RSL', away: 'JUA', us: TV },
  { smId: 19687292, boardDate: '2026-08-11', localTime: '21:00', tz: MX, venue: 'Estadio Universitario', home: 'UANL', away: 'VAN', us: TV, mx: MX_IMAGEN },
  // 8/12
  { smId: 19687291, boardDate: '2026-08-12', localTime: '18:30', tz: ET, venue: 'Inter.co Stadium', home: 'ORL', away: 'ASL', us: TV },
  { smId: 19687290, boardDate: '2026-08-12', localTime: '18:30', tz: ET, venue: 'Nu Stadium', home: 'MIA', away: 'LEO', us: TV },
  { smId: 19687289, boardDate: '2026-08-12', localTime: '19:00', tz: CT, venue: 'GEODIS Park', home: 'MTY', away: 'NSH', us: TV_FS1, mx: MX_IMAGEN },
  { smId: 19687288, boardDate: '2026-08-12', localTime: '21:00', tz: MX, venue: 'Estadio Nemesio Díez', home: 'TOL', away: 'DAL', us: TV, mx: MX_IMAGEN },
  { smId: 19687286, boardDate: '2026-08-12', localTime: '21:15', tz: PT, venue: 'Snapdragon Stadium', home: 'SDL', away: 'PUE', us: TV },
  { smId: 19687287, boardDate: '2026-08-12', localTime: '21:30', tz: PT, venue: 'BMO Stadium', home: 'LAFC', away: 'QRO', us: TV },
  { smId: 19687285, boardDate: '2026-08-12', localTime: '21:30', tz: PT, venue: 'Lumen Field', home: 'SEA', away: 'GDL', us: TV },
  // 8/13
  { smId: 19687284, boardDate: '2026-08-13', localTime: '18:00', tz: ET, venue: 'Subaru Park', home: 'PHI', away: 'SAN', us: TV },
  { smId: 19687283, boardDate: '2026-08-13', localTime: '18:30', tz: ET, venue: 'Sports Illustrated Stadium', home: 'NYC', away: 'NCX', us: TV },
  { smId: 19687281, boardDate: '2026-08-13', localTime: '19:30', tz: CT, venue: 'Q2 Stadium', home: 'AME', away: 'ATX', us: TV },
  { smId: 19687282, boardDate: '2026-08-13', localTime: '20:00', tz: CT, venue: 'SeatGeek Stadium', home: 'CAZ', away: 'CHI', us: TV },
  { smId: 19687280, boardDate: '2026-08-13', localTime: '21:30', tz: PT, venue: 'Providence Park', home: 'POR', away: 'TIJ', us: TV_FS1, mx: MX_IMAGEN },
];

/**
 * Knockout tree — QF/SF sides, venues, and kickoffs are official.
 * `smId` links to Sportmonks for live scores (QF 2026 ids are in the season dump).
 * SF 2 sep: Toluca–León (Houston) · América–Monterrey (Los Ángeles).
 */
export const LEAGUES_CUP_KNOCKOUT: LcKnockoutSlot[] = [
  {
    id: 'lc-qf-1',
    smId: 19868234,
    stage: 'Quarterfinals',
    boardDate: '2026-08-25',
    boardDateLabel: '25 ago',
    home: 'MTY',
    away: 'CHI',
    homeLabel: 'Monterrey',
    awayLabel: 'Chicago',
    homeSeed: 'LMX 4',
    awaySeed: 'MLS 1',
    venueLabel: 'SeatGeek Stadium',
    localTime: '19:30',
    tz: CT,
    us: TV,
  },
  {
    id: 'lc-qf-2',
    smId: 19868232,
    stage: 'Quarterfinals',
    boardDate: '2026-08-26',
    boardDateLabel: '26 ago',
    home: 'TOL',
    away: 'ATX',
    homeLabel: 'Toluca',
    awayLabel: 'Austin',
    homeSeed: 'LMX 3',
    awaySeed: 'MLS 2',
    venueLabel: 'Sports Illustrated Stadium',
    localTime: '20:30',
    tz: ET,
    us: TV_QF_US,
    mx: MX_IMAGEN,
  },
  {
    id: 'lc-qf-3',
    smId: 19868233,
    stage: 'Quarterfinals',
    boardDate: '2026-08-25',
    boardDateLabel: '25 ago',
    home: 'LEO',
    away: 'RSL',
    homeLabel: 'León',
    awayLabel: 'Salt Lake',
    homeSeed: 'LMX 1',
    awaySeed: 'MLS 4',
    venueLabel: "Dick's Sporting Goods Park",
    localTime: '20:30',
    tz: MT,
    us: TV,
  },
  {
    id: 'lc-qf-4',
    smId: 19868231,
    stage: 'Quarterfinals',
    boardDate: '2026-08-26',
    boardDateLabel: '26 ago',
    home: 'AME',
    away: 'COL',
    homeLabel: 'América',
    awayLabel: 'Columbus',
    homeSeed: 'LMX 2',
    awaySeed: 'MLS 3',
    venueLabel: 'Dignity Health Sports Park',
    localTime: '19:45',
    tz: PT,
    us: TV_QF_US,
    mx: MX_QF_TELE,
  },
  {
    id: 'lc-sf-1',
    stage: 'Semifinals',
    boardDate: '2026-09-02',
    boardDateLabel: '2 sep',
    home: 'TOL',
    away: 'LEO',
    homeLabel: 'Toluca',
    awayLabel: 'León',
    homeSeed: '1',
    awaySeed: '28',
    venueLabel: 'Shell Energy Stadium',
    localTime: '20:00',
    tz: CT,
    us: TV,
    feedsFrom: ['lc-qf-2', 'lc-qf-3'],
  },
  {
    id: 'lc-sf-2',
    stage: 'Semifinals',
    boardDate: '2026-09-02',
    boardDateLabel: '2 sep',
    home: 'AME',
    away: 'MTY',
    homeLabel: 'América',
    awayLabel: 'Monterrey',
    homeSeed: '3',
    awaySeed: '11',
    venueLabel: 'Dignity Health Sports Park',
    localTime: '20:30',
    tz: PT,
    us: TV,
    feedsFrom: ['lc-qf-4', 'lc-qf-1'],
  },
  {
    id: 'lc-third',
    stage: 'Third Place Match',
    boardDate: '2026-09-06',
    boardDateLabel: '6 sep',
    home: null,
    away: null,
    homeLabel: 'Perdedor semifinal 1',
    awayLabel: 'Perdedor semifinal 2',
    venueLabel: 'Por anunciar',
    feedsFrom: ['lc-sf-1', 'lc-sf-2'],
  },
  {
    id: 'lc-final',
    stage: 'Final',
    boardDate: '2026-09-06',
    boardDateLabel: '6 sep',
    home: null,
    away: null,
    homeLabel: 'Ganador semifinal 1',
    awayLabel: 'Ganador semifinal 2',
    venueLabel: 'Por anunciar',
    feedsFrom: ['lc-sf-1', 'lc-sf-2'],
  },
];

export const LC_TEAM_NAMES: Record<string, string> = {
  COL: 'Columbus',
  CIN: 'Cincinnati',
  CHL: 'Charlotte',
  MIN: 'Minnesota',
  RSL: 'Salt Lake',
  VAN: 'Vancouver',
  MIA: 'Miami',
  ORL: 'Orlando',
  NSH: 'Nashville',
  DAL: 'Dallas',
  SEA: 'Seattle',
  LAFC: 'LAFC',
  NYC: 'New York City',
  PHI: 'Philadelphia',
  CHI: 'Chicago',
  ATX: 'Austin',
  SDL: 'San Diego',
  POR: 'Portland',
  ATS: 'Atlas',
  PAC: 'Pachuca',
  UNAM: 'Pumas',
  JUA: 'Juárez',
  UANL: 'Tigres',
  ATL: 'Atlante',
  ASL: 'Atlético de San Luis',
  MTY: 'Monterrey',
  LEO: 'León',
  QRO: 'Querétaro',
  TOL: 'Toluca',
  GDL: 'Chivas',
  SAN: 'Santos Laguna',
  CAZ: 'Cruz Azul',
  NCX: 'Necaxa',
  TIJ: 'Tijuana',
  AME: 'América',
  PUE: 'Puebla',
};

/** Liga MX Apertura pause during Leagues Cup Fase 1 (domestic slate resumes Jornada 4). */
export const LIGA_MX_LC_PAUSE_WINDOW = {
  start: '2026-08-04',
  end: '2026-08-13',
} as const;

/** @deprecated Prefer LIGA_MX_LC_PAUSE_WINDOW — kept for older imports. */
export const LEAGUES_CUP_WINDOW = LIGA_MX_LC_PAUSE_WINDOW;

/** True while Liga MX is paused for Leagues Cup Fase 1 (Mexico City calendar). */
export function isLeaguesCupWindow(now = new Date()): boolean {
  const day = now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  return day >= LIGA_MX_LC_PAUSE_WINDOW.start && day <= LIGA_MX_LC_PAUSE_WINDOW.end;
}
