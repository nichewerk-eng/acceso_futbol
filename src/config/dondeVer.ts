import { LEAGUES_CUP_PHASE_ONE } from '@/config/leaguesCup2026';
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
  | 'televisa';

export type TvChannel = {
  id: TvChannelId;
  label: string;
  /** Optional mark; text badge when missing */
  src?: string;
  /** Alternate mark for ink / black surfaces (two-color logos) */
  srcInk?: string;
  /** White/light mark — invert on paper backgrounds */
  onDark?: boolean;
};

export const TV_CHANNELS: Record<TvChannelId, TvChannel> = {
  tudn: {
    id: 'tudn',
    label: 'TUDN',
    src: '/tv_logos/tudn-seeklogo.png',
  },
  vix: {
    id: 'vix',
    label: 'ViX',
    src: '/tv_logos/vix-seeklogo.png',
  },
  'canal-5': {
    id: 'canal-5',
    label: 'Canal 5',
    src: '/tv_logos/Canal_5_Mexico.svg',
    srcInk: '/tv_logos/Canal_5_Mexico_onDark.svg',
  },
  layvtime: {
    id: 'layvtime',
    label: 'LayVTime',
    src: '/tv_logos/layvtime_white.svg',
    onDark: true,
  },
  univision: {
    id: 'univision',
    label: 'Univision',
    src: '/tv_logos/Uni_Vt_Pos_R_Sml_Flt_rgb.png',
  },
  unimas: {
    id: 'unimas',
    label: 'UniMás',
    src: '/tv_logos/UMas_SM_Sml_rgb.png',
  },
  'apple-tv': {
    id: 'apple-tv',
    label: 'Apple TV',
    src: '/tv_logos/AppleTV-iOS.png',
  },
  fs1: {
    id: 'fs1',
    label: 'FS1',
    src: '/tv_logos/fs1-seeklogo.png',
  },
  'imagen-tv': {
    id: 'imagen-tv',
    label: 'Imagen TV',
    src: '/tv_logos/Imagen-TV.png',
  },
  'azteca-7': {
    id: 'azteca-7',
    label: 'Azteca 7',
    src: '/tv_logos/Azteca7.png',
  },
  espn: {
    id: 'espn',
    label: 'ESPN',
    src: '/tv_logos/ESPN.svg',
  },
  'disney-plus': {
    id: 'disney-plus',
    label: 'Disney+',
    src: '/tv_logos/disney-plus.svg',
  },
  fox: {
    id: 'fox',
    label: 'FOX',
    src: '/tv_logos/Fox.svg',
    onDark: true,
  },
  'fox-one': {
    id: 'fox-one',
    label: 'FOX One',
    src: '/tv_logos/FOX-ONE.svg',
    onDark: true,
  },
  'fox-deportes': {
    id: 'fox-deportes',
    label: 'Fox Deportes',
    src: '/tv_logos/Fox_Deportes.svg',
  },
  tsn: {
    id: 'tsn',
    label: 'TSN 5',
  },
  televisa: {
    id: 'televisa',
    label: 'Televisa',
    src: '/tv_logos/Televisa.png',
  },
};

const DEFAULTS = {
  mx: ['vix', 'tudn'] as TvChannelId[],
  us: ['tudn', 'vix'] as TvChannelId[],
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
    us: ['univision', 'vix'],
  },
  '2026-08-15|ATS|UANL': {
    mx: ['canal-5', 'tudn', 'vix'],
    us: ['univision', 'vix'],
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
};

function normAbbr(abbr: string): string {
  return scheduleAbbr(abbr);
}

function pairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  const day = mexicoDayKey(new Date(dateIso));
  const pair = [normAbbr(homeAbbr), normAbbr(awayAbbr)].sort().join('|');
  return `${day}|${pair}`;
}

function labelList(ids: TvChannelId[]): string {
  return ids.map((id) => TV_CHANNELS[id].label).join(' · ');
}

/** Resolve MX/US channels for a fixture (known guide → defaults). */
export function resolveDondeVer(
  fixture: Pick<Fixture, 'date' | 'home' | 'away' | 'venue' | 'city' | 'league'>
): {
  mx: string;
  us: string;
  mxChannels: TvChannelId[];
  usChannels: TvChannelId[];
} {
  const known = GUIDE[pairKey(fixture.date, fixture.home.abbreviation, fixture.away.abbreviation)];
  if (known) {
    return {
      mx: labelList(known.mx),
      us: labelList(known.us),
      mxChannels: known.mx,
      usChannels: known.us,
    };
  }

  if (fixture.league === 'leagues-cup') {
    // Fallback when fixture id is unknown — official board is preferred via attachDondeVer.
    return {
      mx: 'Apple TV',
      us: 'Apple TV',
      mxChannels: ['apple-tv'],
      usChannels: ['apple-tv'],
    };
  }

  const venue = `${fixture.venue ?? ''} ${fixture.city ?? ''}`.toLowerCase();
  const inUs =
    venue.includes('houston') ||
    venue.includes('austin') ||
    venue.includes('dallas') ||
    venue.includes('los angeles') ||
    venue.includes('chicago') ||
    venue.includes('united states') ||
    venue.includes('usa');

  if (inUs) {
    return {
      mx: 'Consulta tu cable / streaming local',
      us: 'Evento en EE.UU. · revisa TUDN / local',
      mxChannels: [],
      usChannels: ['tudn'],
    };
  }

  return {
    mx: labelList(DEFAULTS.mx),
    us: labelList(DEFAULTS.us),
    mxChannels: DEFAULTS.mx,
    usChannels: DEFAULTS.us,
  };
}

/** Official Leagues Cup TV grid by Sportmonks fixture id (Imagen / FS1 selects). */
function leaguesCupBoardDondeVer(fixtureId: string): {
  mx: string;
  us: string;
  mxChannels: TvChannelId[];
  usChannels: TvChannelId[];
} | null {
  const kick = LEAGUES_CUP_PHASE_ONE.find((k) => String(k.smId) === fixtureId);
  if (!kick) return null;
  const us = kick.us;
  const mx: TvChannelId[] = kick.mx ?? ['apple-tv'];
  return {
    mx: labelList(mx),
    us: labelList(us),
    mxChannels: mx,
    usChannels: us,
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
    return fixture;
  }
  const d = resolveDondeVer(fixture);
  return {
    ...fixture,
    dondeVer: {
      mx: d.mx,
      us: d.us,
      mxChannels: d.mxChannels,
      usChannels: d.usChannels,
    },
  };
}
