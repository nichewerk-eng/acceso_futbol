import { LEAGUES_CUP_KNOCKOUT, LEAGUES_CUP_PHASE_ONE } from '@/config/leaguesCup2026';
import { mexicoDayKey } from '@/lib/radio/phases';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { Fixture } from '@/lib/sports/types';

export type TvChannelId =
  | 'tudn'
  | 'vix'
  | 'canal-5'
  | 'layvtime'
  | 'univision'
  | 'unimas'
  | 'apple-tv'
  | 'fs1'
  | 'imagen-tv'
  | 'azteca-7'
  | 'espn'
  | 'disney-plus'
  | 'fox'
  | 'fox-one'
  | 'fox-deportes'
  | 'tsn'
  | 'televisa'
  | 'nueve'
  | 'prime-video'
  | 'telemundo'
  | 'universo'
  | 'estrella-tv'
  | 'tubi'
  | 'youtube';

export type TvChannel = {
  id: TvChannelId;
  label: string;
  /** Linear broadcast vs app / streamer */
  kind: 'tv' | 'stream';
  /** Optional mark; text badge when missing */
  src?: string;
  /** Alternate mark for ink / black surfaces (two-color logos) */
  srcInk?: string;
  /** White/light mark — invert on paper backgrounds */
  onDark?: boolean;
  /** Official watch page when the mark should be tappable */
  href?: string;
};

export const TV_CHANNELS: Record<TvChannelId, TvChannel> = {
  tudn: {
    id: 'tudn',
    label: 'TUDN',
    kind: 'tv',
    src: '/tv_logos/tudn-seeklogo.png',
  },
  vix: {
    id: 'vix',
    label: 'ViX',
    kind: 'stream',
    src: '/tv_logos/vix-seeklogo.png',
  },
  'canal-5': {
    id: 'canal-5',
    label: 'Canal 5',
    kind: 'tv',
    src: '/tv_logos/Canal_5_Mexico.svg',
    srcInk: '/tv_logos/Canal_5_Mexico_onDark.svg',
  },
  layvtime: {
    id: 'layvtime',
    label: 'LayVTime',
    kind: 'stream',
    src: '/tv_logos/layvtime_white.svg',
    onDark: true,
  },
  univision: {
    id: 'univision',
    label: 'Univision',
    kind: 'tv',
    src: '/tv_logos/Uni_Vt_Pos_R_Sml_Flt_rgb.png',
  },
  unimas: {
    id: 'unimas',
    label: 'UniMás',
    kind: 'tv',
    src: '/tv_logos/UMas_SM_Sml_rgb.png',
  },
  'apple-tv': {
    id: 'apple-tv',
    label: 'Apple TV',
    kind: 'stream',
    src: '/tv_logos/AppleTV-iOS.png',
  },
  fs1: {
    id: 'fs1',
    label: 'FS1',
    kind: 'tv',
    src: '/tv_logos/fs1-seeklogo.png',
  },
  'imagen-tv': {
    id: 'imagen-tv',
    label: 'Imagen TV',
    kind: 'tv',
    src: '/tv_logos/Imagen-TV.png',
  },
  'azteca-7': {
    id: 'azteca-7',
    label: 'Azteca 7',
    kind: 'tv',
    src: '/tv_logos/Azteca7.png',
  },
  espn: {
    id: 'espn',
    label: 'ESPN',
    kind: 'tv',
    src: '/tv_logos/ESPN.svg',
  },
  'disney-plus': {
    id: 'disney-plus',
    label: 'Disney+',
    kind: 'stream',
    src: '/tv_logos/disney-plus.svg',
  },
  fox: {
    id: 'fox',
    label: 'FOX',
    kind: 'tv',
    src: '/tv_logos/Fox.svg',
    onDark: true,
  },
  'fox-one': {
    id: 'fox-one',
    label: 'FOX One',
    kind: 'stream',
    src: '/tv_logos/FOX-ONE.svg',
    onDark: true,
  },
  'fox-deportes': {
    id: 'fox-deportes',
    label: 'Fox Deportes',
    kind: 'tv',
    src: '/tv_logos/Fox_Deportes.svg',
  },
  tsn: {
    id: 'tsn',
    label: 'TSN 5',
    kind: 'tv',
  },
  televisa: {
    id: 'televisa',
    label: 'Televisa',
    kind: 'tv',
    src: '/tv_logos/Televisa.png',
  },
  nueve: {
    id: 'nueve',
    label: 'Nueve',
    kind: 'tv',
    src: '/tv_logos/Nueve.svg',
    srcInk: '/tv_logos/Nueve_onDark.svg',
  },
  'prime-video': {
    id: 'prime-video',
    label: 'Prime Video',
    kind: 'stream',
    src: '/tv_logos/Prime_Video.png',
  },
  telemundo: {
    id: 'telemundo',
    label: 'Telemundo',
    kind: 'tv',
    src: '/tv_logos/Telemundo.svg',
  },
  universo: {
    id: 'universo',
    label: 'Universo',
    kind: 'tv',
    src: '/tv_logos/Universo.png',
  },
  'estrella-tv': {
    id: 'estrella-tv',
    label: 'Estrella TV',
    kind: 'tv',
    src: '/tv_logos/Estrella_TV.svg',
  },
  tubi: {
    id: 'tubi',
    label: 'Tubi',
    kind: 'stream',
    src: '/tv_logos/Tubi.svg',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube Femenil',
    kind: 'stream',
    src: '/tv_logos/YouTube.png',
    href: 'https://www.youtube.com/@ligabbvamxfemenil',
  },
};

const UNCONFIRMED = {
  mx: 'Por confirmar',
  us: 'Por confirmar',
  mxChannels: [] as TvChannelId[],
  usChannels: [] as TvChannelId[],
  confirmed: false,
};

/**
 * Known broadcast guides keyed by MX calendar day + sorted abbr pair.
 * Expand as rights are confirmed per jornada.
 */
const GUIDE: Record<string, { mx: TvChannelId[]; us: TvChannelId[] }> = {
  // Jornada 3 · domingo 2 ago 2026
  '2026-08-02|AME|SAN': {
    mx: ['vix', 'layvtime', 'tudn', 'canal-5'],
    us: ['tudn'],
  },
  '2026-08-02|NCX|TOL': {
    mx: ['vix', 'tudn', 'canal-5'],
    us: ['vix', 'tudn'],
  },

  // Jornada 4 · 15–17 ago 2026
  '2026-08-15|ATL|TOL': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['tudn', 'univision'],
  },
  '2026-08-15|JUA|MTY': {
    mx: ['canal-5', 'tudn', 'vix'],
    us: ['tudn', 'univision', 'vix'],
  },
  '2026-08-15|ATS|UANL': {
    mx: ['canal-5', 'tudn', 'vix'],
    us: ['tudn', 'univision', 'vix'],
  },
  '2026-08-16|QRO|UNAM': {
    mx: ['vix'],
    us: ['univision', 'vix'],
  },
  '2026-08-16|AME|ASL': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'vix'],
  },
  '2026-08-16|GDL|SAN': {
    mx: ['canal-5', 'tudn', 'vix'],
    us: ['tudn', 'vix'],
  },
  '2026-08-16|CAZ|TIJ': {
    mx: ['fox-one'],
    us: ['tudn'],
  },
  '2026-08-17|LEO|NCX': {
    mx: ['fox', 'fox-one'],
    us: ['fox-deportes'],
  },
  '2026-08-17|PAC|PUE': {
    mx: ['fox', 'fox-one'],
    us: ['tudn'],
  },

  // Jornada 5 · 21–23 ago 2026
  // Sportmonks moved León/Tigres to viernes and Puebla to sábado; keep both days.
  '2026-08-21|LEO|MTY': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['tudn'],
  },
  '2026-08-22|LEO|MTY': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['tudn'],
  },
  'j5|LEO|MTY': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['tudn'],
  },
  '2026-08-21|ATL|UANL': {
    mx: ['fox', 'fox-one'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  '2026-08-22|ATL|UANL': {
    mx: ['fox', 'fox-one'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  'j5|ATL|UANL': {
    mx: ['fox', 'fox-one'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  '2026-08-21|AME|JUA': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  '2026-08-22|AME|JUA': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  'j5|AME|JUA': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  // QRO–TOL: FOX + FOX One MX, TUDN US. Date + jornada keys cover kickoff shuffle.
  '2026-08-21|QRO|TOL': {
    mx: ['fox', 'fox-one'],
    us: ['tudn'],
  },
  '2026-08-22|QRO|TOL': {
    mx: ['fox', 'fox-one'],
    us: ['tudn'],
  },
  '2026-08-23|QRO|TOL': {
    mx: ['fox', 'fox-one'],
    us: ['tudn'],
  },
  'j5|QRO|TOL': {
    mx: ['fox', 'fox-one'],
    us: ['tudn'],
  },
  '2026-08-22|GDL|TIJ': {
    mx: ['prime-video'],
    us: ['telemundo', 'universo'],
  },
  'j5|GDL|TIJ': {
    mx: ['prime-video'],
    us: ['telemundo', 'universo'],
  },
  '2026-08-21|PUE|SAN': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['vix'],
  },
  '2026-08-22|PUE|SAN': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['vix'],
  },
  'j5|PUE|SAN': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['vix'],
  },
  '2026-08-22|ATS|CAZ': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['univision', 'tudn'],
  },
  '2026-08-23|ASL|PAC': {
    mx: ['vix', 'espn', 'disney-plus'],
    us: ['vix'],
  },
  'j5|ASL|PAC': {
    mx: ['vix', 'espn', 'disney-plus'],
    us: ['vix'],
  },
  '2026-08-23|NCX|UNAM': {
    mx: ['canal-5', 'tudn', 'vix'],
    us: ['tudn'],
  },

  // Jornada 6 · 28–30 ago 2026
  '2026-08-28|ATL|LEO': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['tudn'],
  },
  'j6|ATL|LEO': {
    mx: ['azteca-7', 'espn', 'disney-plus'],
    us: ['tudn'],
  },
  '2026-08-28|CAZ|NCX': {
    mx: ['fox-one'],
    us: ['fox-deportes'],
  },
  'j6|CAZ|NCX': {
    mx: ['fox-one'],
    us: ['fox-deportes'],
  },
  '2026-08-28|TIJ|UNAM': {
    mx: ['fox-one'],
    us: ['tudn'],
  },
  'j6|TIJ|UNAM': {
    mx: ['fox-one'],
    us: ['tudn'],
  },
  '2026-08-29|ATS|QRO': {
    mx: ['vix', 'layvtime'],
    us: ['vix'],
  },
  'j6|ATS|QRO': {
    mx: ['vix', 'layvtime'],
    us: ['vix'],
  },
  '2026-08-29|GDL|PAC': {
    mx: ['fox', 'fox-one'],
    us: ['tudn', 'univision'],
  },
  'j6|GDL|PAC': {
    mx: ['fox', 'fox-one'],
    us: ['tudn', 'univision'],
  },
  '2026-08-29|AME|PUE': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision', 'vix'],
  },
  'j6|AME|PUE': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision', 'vix'],
  },
  '2026-08-29|SAN|UANL': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision'],
  },
  'j6|SAN|UANL': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision'],
  },
  '2026-08-30|JUA|TOL': {
    mx: ['vix'],
    us: ['tudn'],
  },
  'j6|JUA|TOL': {
    mx: ['vix'],
    us: ['tudn'],
  },
  '2026-08-30|ASL|MTY': {
    mx: ['vix', 'layvtime'],
    us: ['vix', 'tudn'],
  },
  'j6|ASL|MTY': {
    mx: ['vix', 'layvtime'],
    us: ['vix', 'tudn'],
  },

  // Jornada 7 · 4–6 sep 2026
  '2026-09-04|JUA|PAC': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  'j7|JUA|PAC': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  '2026-09-05|NCX|UANL': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  'j7|NCX|UANL': {
    mx: ['fox', 'fox-one', 'azteca-7'],
    us: ['fox-deportes', 'universo', 'estrella-tv'],
  },
  '2026-09-05|ATL|ATS': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision'],
  },
  'j7|ATL|ATS': {
    mx: ['canal-5', 'tudn', 'vix', 'layvtime'],
    us: ['tudn', 'univision'],
  },
  '2026-09-06|CAZ|SAN': {
    mx: ['vix', 'tudn', 'canal-5', 'layvtime'],
    us: ['univision', 'tudn'],
  },
  'j7|CAZ|SAN': {
    mx: ['vix', 'tudn', 'canal-5', 'layvtime'],
    us: ['univision', 'tudn'],
  },
};

/**
 * Liga MX broadcast rights are sold per HOME club, so when a club hosts we can
 * assume its channel set even before the exact per-match grid is confirmed.
 * The dated GUIDE above always wins; this is the home-club fallback. Keyed by
 * normalized (schedule) home abbr.
 */
const CLUB_HOME_TV: Record<string, { mx: TvChannelId[]; us: TvChannelId[] }> = {
  TIJ: { mx: ['fox-one'], us: ['tudn'] },
  UNAM: { mx: ['vix'], us: ['univision', 'vix'] },
  MTY: { mx: ['canal-5', 'tudn', 'vix'], us: ['tudn', 'univision', 'vix'] },
  NCX: { mx: ['fox', 'fox-one'], us: ['fox-deportes'] },
  CAZ: { mx: ['vix', 'tudn', 'canal-5'], us: ['vix', 'univision', 'tudn'] },
  QRO: { mx: ['fox', 'fox-one'], us: ['univision', 'tudn'] },
  ATS: { mx: ['canal-5', 'tudn', 'vix'], us: ['tudn', 'univision', 'vix'] },
  AME: { mx: ['canal-5', 'tudn', 'vix', 'layvtime'], us: ['tudn', 'vix'] },
  ATL: { mx: ['azteca-7', 'espn', 'disney-plus'], us: ['tudn', 'univision'] },
  PUE: { mx: ['fox', 'fox-one', 'azteca-7'], us: ['vix'] },
  GDL: { mx: ['prime-video'], us: ['telemundo', 'universo', 'fox-deportes'] },
  PAC: { mx: ['fox', 'fox-one'], us: ['tudn'] },
  TOL: { mx: ['canal-5', 'tudn', 'vix'], us: ['tudn', 'vix'] },
  LEO: { mx: ['fox', 'fox-one'], us: ['vix'] },
  ASL: { mx: ['vix', 'espn', 'disney-plus'], us: ['vix'] },
  UANL: { mx: ['fox', 'fox-one', 'azteca-7'], us: ['fox-deportes', 'universo'] },
  SAN: { mx: ['canal-5', 'tudn', 'vix'], us: ['tudn', 'vix'] },
  JUA: { mx: ['fox', 'fox-one', 'azteca-7'], us: ['fox-deportes', 'universo'] },
};

/** Liga MX Femenil MX rights follow the home club. No US grid yet. */
const TUBI: TvChannelId[] = ['tubi'];
const TELE_YT: TvChannelId[] = ['televisa', 'youtube'];
const ESPN_YT: TvChannelId[] = ['espn', 'youtube'];
const YT_ONLY: TvChannelId[] = ['youtube'];

const FEMENIL_CLUB_HOME_TV: Record<string, TvChannelId[]> = {
  AME: TELE_YT,
  ATL: YT_ONLY,
  ATS: TUBI,
  ASL: ESPN_YT,
  TIJ: TUBI,
  CAZ: TELE_YT,
  JUA: TUBI,
  QRO: TUBI,
  GDL: TUBI,
  LEO: TUBI,
  NCX: TUBI,
  PAC: TUBI,
  PUE: YT_ONLY,
  MTY: TELE_YT,
  SAN: TUBI,
  UANL: TUBI,
  TOL: TELE_YT,
  UNAM: TELE_YT,
};

function normAbbr(abbr: string): string {
  return scheduleAbbr(abbr);
}

function sortedPair(homeAbbr: string, awayAbbr: string): string {
  return [normAbbr(homeAbbr), normAbbr(awayAbbr)].sort().join('|');
}

function pairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  const day = mexicoDayKey(new Date(dateIso));
  return `${day}|${sortedPair(homeAbbr, awayAbbr)}`;
}

function jornadaGuideKey(
  jornada: string | null | undefined,
  homeAbbr: string,
  awayAbbr: string
): string | null {
  const n = String(jornada ?? '').match(/(\d+)/)?.[1];
  return n ? `j${n}|${sortedPair(homeAbbr, awayAbbr)}` : null;
}

function labelList(ids: TvChannelId[]): string {
  return ids.map((id) => TV_CHANNELS[id].label).join(' · ');
}

/** Resolve MX/US channels for a fixture (known guide → unconfirmed). */
export function resolveDondeVer(
  fixture: Pick<Fixture, 'date' | 'home' | 'away' | 'venue' | 'city' | 'league' | 'jornada'>
): {
  mx: string;
  us: string;
  mxChannels: TvChannelId[];
  usChannels: TvChannelId[];
  confirmed: boolean;
} {
  if (fixture.league === 'liga-mx-femenil') {
    const mx = FEMENIL_CLUB_HOME_TV[normAbbr(fixture.home.abbreviation)];
    if (mx?.length) {
      return {
        mx: labelList(mx),
        us: '',
        mxChannels: mx,
        usChannels: [],
        confirmed: true,
      };
    }
    return { ...UNCONFIRMED };
  }
  const dateKey = pairKey(fixture.date, fixture.home.abbreviation, fixture.away.abbreviation);
  const jornadaKey = jornadaGuideKey(
    fixture.jornada,
    fixture.home.abbreviation,
    fixture.away.abbreviation
  );
  const known = GUIDE[dateKey] ?? (jornadaKey ? GUIDE[jornadaKey] : undefined);
  if (known) {
    return {
      mx: labelList(known.mx),
      us: labelList(known.us),
      mxChannels: known.mx,
      usChannels: known.us,
      confirmed: true,
    };
  }

  if (fixture.league === 'leagues-cup') {
    // Fallback when fixture id is unknown — official board is preferred via attachDondeVer.
    return {
      mx: 'Apple TV',
      us: 'Apple TV',
      mxChannels: ['apple-tv'],
      usChannels: ['apple-tv'],
      confirmed: true,
    };
  }

  // Home-club default (Liga MX rights follow the home club).
  if (fixture.league === 'liga-mx') {
    const homeClub = CLUB_HOME_TV[normAbbr(fixture.home.abbreviation)];
    if (homeClub) {
      return {
        mx: labelList(homeClub.mx),
        us: labelList(homeClub.us),
        mxChannels: homeClub.mx,
        usChannels: homeClub.us,
        confirmed: true,
      };
    }
  }

  return { ...UNCONFIRMED };
}

/** Official Leagues Cup TV grid by board id or Sportmonks fixture id. */
function leaguesCupBoardDondeVer(fixtureId: string): {
  mx: string;
  us: string;
  mxChannels: TvChannelId[];
  usChannels: TvChannelId[];
  confirmed: boolean;
} | null {
  const kick = LEAGUES_CUP_PHASE_ONE.find((k) => String(k.smId) === fixtureId);
  if (kick) {
    const us = kick.us;
    const mx: TvChannelId[] = kick.mx ?? ['apple-tv'];
    return {
      mx: labelList(mx),
      us: labelList(us),
      mxChannels: mx,
      usChannels: us,
      confirmed: true,
    };
  }
  const slot =
    LEAGUES_CUP_KNOCKOUT.find((s) => s.id === fixtureId) ??
    LEAGUES_CUP_KNOCKOUT.find((s) => s.smId != null && String(s.smId) === fixtureId);
  if (!slot) return null;
  const us = slot.us ?? ['apple-tv'];
  const mx: TvChannelId[] = slot.mx ?? ['apple-tv'];
  return {
    mx: labelList(mx),
    us: labelList(us),
    mxChannels: mx,
    usChannels: us,
    confirmed: true,
  };
}

export function attachDondeVer(fixture: Fixture): Fixture {
  // Leagues Cup: always prefer the official board listing (not Apple-TV-only defaults).
  if (fixture.league === 'leagues-cup') {
    const board = leaguesCupBoardDondeVer(fixture.id);
    if (board) {
      return { ...fixture, dondeVer: board };
    }
  }

  // Keep other curated boards that already carry channel ids.
  if (fixture.dondeVer?.usChannels?.length || fixture.dondeVer?.mxChannels?.length) {
    if (fixture.dondeVer.confirmed) return fixture;
    return {
      ...fixture,
      dondeVer: { ...fixture.dondeVer, confirmed: true },
    };
  }
  const d = resolveDondeVer(fixture);
  return {
    ...fixture,
    dondeVer: {
      mx: d.mx,
      us: d.us,
      mxChannels: d.mxChannels,
      usChannels: d.usChannels,
      confirmed: d.confirmed,
    },
  };
}
