import {
  EL_TRI_FRIENDLIES,
  EL_TRI_TEAM_NAMES,
  elTriLocalToIso,
  elTriTbaIso,
  type ElTriKick,
} from '@/config/elTri2026';
import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';
import type { Fixture, MatchSnapshot, TeamRef } from './types';

const EL_TRI_LOGOS: Record<string, string> = {
  MEX: '/seleccion_logo/mexico.png',
  COL: '/seleccion_logo/colombia.png',
  PER: '/seleccion_logo/peru.png',
  USA: '/seleccion_logo/usa.png',
  CHI: '/seleccion_logo/chile.png',
};

function teamFrom(abbr: string, name: string, score: string | null = null): TeamRef {
  const code = abbr.toUpperCase();
  return {
    id: code,
    name: EL_TRI_TEAM_NAMES[code] ?? name,
    abbreviation: code,
    logo: EL_TRI_LOGOS[code],
    score,
  };
}

function channelsFor(listing: { us?: TvChannelId[]; mx?: TvChannelId[] }): Fixture['dondeVer'] {
  const us = listing.us ?? [];
  const mx = listing.mx ?? [];
  if (!us.length && !mx.length) {
    return {
      mx: 'Por confirmar',
      us: 'Por confirmar',
      mxChannels: [],
      usChannels: [],
      confirmed: false,
    };
  }
  return {
    mx: mx.length ? mx.map((id) => TV_CHANNELS[id].label).join(' · ') : 'Por confirmar',
    us: us.length ? us.map((id) => TV_CHANNELS[id].label).join(' · ') : 'Por confirmar',
    mxChannels: mx,
    usChannels: us,
    confirmed: us.length > 0 || mx.length > 0,
  };
}

function fixtureFromKick(kick: ElTriKick, live?: Fixture): Fixture {
  const scheduled = Boolean(kick.localTime);
  const date = scheduled
    ? elTriLocalToIso(kick.boardDate, kick.localTime!, kick.tz)
    : elTriTbaIso(kick.boardDate);
  const home = teamFrom(kick.home, kick.homeName, live?.home.score ?? null);
  const away = teamFrom(kick.away, kick.awayName, live?.away.score ?? null);
  return {
    id: kick.id,
    provider: live?.provider ?? 'espn',
    league: 'seleccion',
    date,
    scheduleDay: kick.boardDate,
    venueTz: kick.tz,
    jornada: kick.competition,
    state: live?.state ?? 'pre',
    statusLabel:
      live?.statusLabel ?? (scheduled ? 'Programado' : 'Por anunciar'),
    clock: live?.clock,
    venue: kick.venue ?? live?.venue ?? null,
    city: live?.city ?? null,
    home: live?.home
      ? { ...home, score: live.home.score, logo: home.logo ?? live.home.logo }
      : home,
    away: live?.away
      ? { ...away, score: live.away.score, logo: away.logo ?? live.away.logo }
      : away,
    dondeVer: channelsFor({ us: kick.us, mx: kick.mx }),
  };
}

function sameSides(a: Fixture, kick: ElTriKick): boolean {
  const h = a.home.abbreviation.toUpperCase();
  const aw = a.away.abbreviation.toUpperCase();
  const wantH = kick.home.toUpperCase();
  const wantA = kick.away.toUpperCase();
  return (h === wantH && aw === wantA) || (h === wantA && aw === wantH);
}

function overlayKick(kick: ElTriKick, live: Fixture[]): Fixture {
  const dayHits = live.filter((f) => {
    const day = f.scheduleDay ?? f.date.slice(0, 10);
    if (day !== kick.boardDate && !f.date.startsWith(kick.boardDate)) {
      // ESPN dates are ISO — also match Mexico calendar via boardDate in kick
      const espnDay = new Date(f.date).toLocaleDateString('en-CA', {
        timeZone: kick.tz,
      });
      if (espnDay !== kick.boardDate) return false;
    }
    return sameSides(f, kick);
  });
  return fixtureFromKick(kick, dayHits[0]);
}

/** Official El Tri friendlies board (static + optional ESPN overlay). */
export function buildElTriBoard(live: Fixture[] = []): Fixture[] {
  return EL_TRI_FRIENDLIES.map((kick) => overlayKick(kick, live)).sort(
    (a, b) => +new Date(a.date) - +new Date(b.date)
  );
}

export function elTriFriendlyIds(): Set<string> {
  return new Set(EL_TRI_FRIENDLIES.map((k) => k.id));
}

/** Match page fallback for official board ids (`el-tri-…`). */
export function officialElTriMatch(id: string): MatchSnapshot | null {
  const kick = EL_TRI_FRIENDLIES.find((k) => k.id === id);
  if (!kick) return null;
  return { ...fixtureFromKick(kick), events: [], comments: [] };
}
