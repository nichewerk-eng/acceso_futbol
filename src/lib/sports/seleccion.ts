import { espnFetch, SLUG } from '@/lib/espn';
import { attachDondeVer } from '@/config/dondeVer';
import type { Fixture, MatchState } from './types';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';

const MEXICO_TEAM_ID = '203';

type CompetitorRaw = {
  homeAway: 'home' | 'away';
  team: { id?: string; displayName: string; abbreviation: string; logos?: { href: string }[] };
  score?: string;
};

type EventRaw = {
  id: string;
  date: string;
  status?: {
    displayClock?: string;
    type?: { completed?: boolean; state?: string; description?: string; shortDetail?: string };
  };
  competitions?: {
    competitors: CompetitorRaw[];
    venue?: { fullName: string; address?: { city?: string } };
  }[];
};

function toState(raw?: string, completed?: boolean): MatchState {
  if (completed || raw === 'post') return 'post';
  if (raw === 'in') return 'in';
  return 'pre';
}

function mapEvent(event: EventRaw): Fixture {
  const comp = event.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  const state = toState(event.status?.type?.state, event.status?.type?.completed);
  return attachDondeVer({
    id: event.id,
    provider: 'espn',
    league: 'seleccion',
    date: event.date,
    jornada: 'El Tri',
    state,
    statusLabel:
      event.status?.type?.shortDetail ||
      event.status?.type?.description ||
      (state === 'in' ? 'EN VIVO' : state === 'post' ? 'Final' : 'Próximo'),
    clock: event.status?.displayClock,
    venue: comp?.venue?.fullName ?? null,
    city: comp?.venue?.address?.city ?? null,
    home: {
      id: home?.team?.id ?? home?.team?.abbreviation ?? 'home',
      name: home?.team?.displayName ?? 'Local',
      abbreviation: home?.team?.abbreviation ?? 'LOC',
      logo: home?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : (home?.score ?? null),
    },
    away: {
      id: away?.team?.id ?? away?.team?.abbreviation ?? 'away',
      name: away?.team?.displayName ?? 'Visitante',
      abbreviation: away?.team?.abbreviation ?? 'VIS',
      logo: away?.team?.logos?.[0]?.href,
      score: state === 'pre' ? null : (away?.score ?? null),
    },
  });
}

async function fetchSeleccionScheduleRaw(): Promise<Fixture[]> {
  const raw = (await espnFetch(
    `https://site.web.api.espn.com/apis/site/v2/sports/soccer/${SLUG.WORLD_CUP}/teams/${MEXICO_TEAM_ID}/schedule`
  )) as { events?: EventRaw[] };
  return (raw.events ?? []).map(mapEvent);
}

/** Full El Tri schedule (WC / friendlies as ESPN lists them). */
export async function fetchSeleccionSchedule(): Promise<Fixture[]> {
  try {
    return await fetchSeleccionScheduleRaw();
  } catch {
    return [];
  }
}

/** Mexico national team fixtures for the Mexico City calendar day. */
export async function fetchSeleccionGamesOfDay(dayKey = mexicoDayKey()): Promise<Fixture[]> {
  try {
    const all = await fetchSeleccionScheduleRaw();
    return all.filter((f) => isMexicoDay(f.date, dayKey));
  } catch {
    return [];
  }
}
