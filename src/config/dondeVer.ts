import { mexicoDayKey } from '@/lib/radio/phases';
import { scheduleAbbr } from '@/lib/sports/ligaMxAbbr';
import type { Fixture } from '@/lib/sports/types';

export type TvChannelId =
  | 'tudn'
  | 'vix'
  | 'canal-5'
  | 'layvtime'
  | 'univision'
  | 'apple-tv'
  | 'fs1'
  | 'imagen-tv';

export type TvChannel = {
  id: TvChannelId;
  label: string;
  /** Optional mark; text badge when missing */
  src?: string;
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
    src: '/tv_logos/canal-5-seeklogo.png',
  },
  layvtime: {
    id: 'layvtime',
    label: 'LayVTime',
    src: '/tv_logos/layvtime_white.svg',
    onDark: true,
  },
  univision: {
    id: 'univision',
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
};

const DEFAULTS = {
  mx: ['vix', 'tudn'] as TvChannelId[],
  us: ['univision', 'tudn', 'vix'] as TvChannelId[],
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
    // Every match on Apple TV. US linear (UniMás / FS1) and MX linear (Imagen / Televisa) are select-only.
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

export function attachDondeVer(fixture: Fixture): Fixture {
  // Keep curated boards (e.g. Leagues Cup official TV grid).
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
