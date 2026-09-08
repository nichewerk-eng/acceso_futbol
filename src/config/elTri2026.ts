import type { TvChannelId } from '@/config/dondeVer';

/**
 * Official El Tri calendar window — Sep–Oct 2026 friendlies.
 * Kickoffs marked TBA stay date-only until the federation publishes a time.
 */

export type ElTriKick = {
  id: string;
  boardDate: string;
  /** Venue-local kickoff (24h). Null = por anunciar. */
  localTime: string | null;
  tz: string;
  home: string;
  away: string;
  homeName: string;
  awayName: string;
  competition: string;
  venue?: string;
  us?: TvChannelId[];
  mx?: TvChannelId[];
};

const ET = 'America/New_York';
const MX = 'America/Mexico_City';

/** US listing for USA–México (TNT / Max / Telemundo / Universo / Peacock). */
const USA_MEX_TV = ['tnt', 'max', 'telemundo', 'universo', 'peacock'] as TvChannelId[];

export const EL_TRI_TEAM_NAMES: Record<string, string> = {
  MEX: 'México',
  COL: 'Colombia',
  PER: 'Perú',
  USA: 'Estados Unidos',
  CHI: 'Chile',
};

/** Convert venue-local wall time → UTC ISO. */
export function elTriLocalToIso(boardDate: string, localTime: string, tz: string): string {
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

/** Midday Mexico City anchor when kickoff is TBA (sort / day grouping only). */
export function elTriTbaIso(boardDate: string): string {
  return elTriLocalToIso(boardDate, '12:00', MX);
}

export const EL_TRI_FRIENDLIES: ElTriKick[] = [
  {
    id: 'el-tri-2026-09-26-col',
    boardDate: '2026-09-26',
    localTime: null,
    tz: MX,
    home: 'MEX',
    away: 'COL',
    homeName: 'México',
    awayName: 'Colombia',
    competition: 'Amistosos internacionales',
  },
  {
    id: 'el-tri-2026-09-29-per',
    boardDate: '2026-09-29',
    localTime: null,
    tz: MX,
    home: 'MEX',
    away: 'PER',
    homeName: 'México',
    awayName: 'Perú',
    competition: 'Amistosos internacionales',
  },
  {
    id: 'el-tri-2026-10-03-usa',
    boardDate: '2026-10-03',
    localTime: '21:00',
    tz: ET,
    home: 'USA',
    away: 'MEX',
    homeName: 'Estados Unidos',
    awayName: 'México',
    competition: 'Amistosos internacionales',
    us: USA_MEX_TV,
  },
  {
    id: 'el-tri-2026-10-06-chi',
    boardDate: '2026-10-06',
    localTime: null,
    tz: MX,
    home: 'MEX',
    away: 'CHI',
    homeName: 'México',
    awayName: 'Chile',
    competition: 'Amistosos internacionales',
  },
];
