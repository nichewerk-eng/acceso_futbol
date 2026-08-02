import { mexicoDayKey } from '@/lib/radio/phases';
import type { Fixture } from '@/lib/sports/types';

export type TvChannelId = 'tudn' | 'vix' | 'canal-5' | 'layvtime' | 'univision';

export type TvChannel = {
  id: TvChannelId;
  label: string;
  src: string;
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
    label: 'Univision',
    src: '/tv_logos/Uni_Vt_Pos_R_Sml_Flt_rgb.png',
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

function pairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  const day = mexicoDayKey(new Date(dateIso));
  const pair = [homeAbbr.toUpperCase(), awayAbbr.toUpperCase()].sort().join('|');
  return `${day}|${pair}`;
}

function labelList(ids: TvChannelId[]): string {
  return ids.map((id) => TV_CHANNELS[id].label).join(' · ');
}

/** Resolve MX/US channels for a fixture (known guide → defaults). */
export function resolveDondeVer(fixture: Pick<Fixture, 'date' | 'home' | 'away' | 'venue' | 'city'>): {
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
