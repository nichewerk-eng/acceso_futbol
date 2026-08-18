import { preferSportmonksId } from '@/fixtures/ligamx-apertura-2026';
import {
  aperturaCalendar,
  rememberOverlaySmIds,
} from './aperturaSmMap';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import type { Fixture } from './types';

/** Minimal fixture shape shared by API + Liga MX UI. */
export type LigaMxScheduleFixture = {
  id: string;
  date: string;
  league: 'liga-mx' | 'liga-mx-femenil';
  jornada: string | null;
  status: {
    completed: boolean;
    state: string;
    description: string;
    shortDetail: string;
    displayClock: string;
  };
  venue: string | null;
  city: string | null;
  home: { name: string; abbreviation: string; score: string | null };
  away: { name: string; abbreviation: string; score: string | null };
};

function jornadaNum(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function jornadaPairKey(
  jornada: string | null | undefined,
  homeAbbr: string,
  awayAbbr: string
): string | null {
  const n = jornadaNum(jornada);
  if (n === null) return null;
  return `${n}|${scheduleAbbr(homeAbbr)}|${scheduleAbbr(awayAbbr)}`;
}

export function fixtureToLigaMxSchedule(f: Fixture): LigaMxScheduleFixture {
  return {
    id: f.id,
    date: f.date,
    league: f.league === 'liga-mx-femenil' ? 'liga-mx-femenil' : 'liga-mx',
    jornada: f.jornada ?? null,
    status: {
      completed: f.state === 'post',
      state: f.state,
      description: f.statusLabel,
      shortDetail: f.statusLabel,
      displayClock: f.clock ?? '',
    },
    venue: f.venue ?? null,
    city: f.city ?? null,
    home: {
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: f.home.score ?? null,
    },
    away: {
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: f.away.score ?? null,
    },
  };
}

/**
 * Static schedule owns jornada labels + full calendar.
 * Live provider (Sportmonks / ESPN) overlays state, scores, and real fixture ids.
 */
export function mergeLigaMxSchedule(live: LigaMxScheduleFixture[]): LigaMxScheduleFixture[] {
  if (live.length === 0) return aperturaCalendar();

  const seed = aperturaCalendar();
  const byDay = new Map(
    live.map((f) => [dayPairKey(f.date, f.home.abbreviation, f.away.abbreviation), f])
  );
  const byJornada = new Map<string, LigaMxScheduleFixture>();
  for (const f of live) {
    const jk = jornadaPairKey(f.jornada, f.home.abbreviation, f.away.abbreviation);
    if (jk) byJornada.set(jk, f);
  }
  const usedLive = new Set<string>();

  const merged = seed.map((s) => {
    const dayKey = dayPairKey(s.date, s.home.abbreviation, s.away.abbreviation);
    const jk = jornadaPairKey(s.jornada, s.home.abbreviation, s.away.abbreviation);
    const overlay = byDay.get(dayKey) ?? (jk ? byJornada.get(jk) : undefined);
    if (!overlay) return s;
    usedLive.add(overlay.id);
    return {
      ...s,
      id: preferSportmonksId(s.id, overlay.id),
      date: overlay.date,
      status: overlay.status,
      venue: overlay.venue ?? s.venue,
      city: overlay.city ?? s.city,
      home: { ...s.home, score: overlay.home.score },
      away: { ...s.away, score: overlay.away.score },
    };
  });
  rememberOverlaySmIds(seed, merged);

  for (const f of live) {
    if (!usedLive.has(f.id) && f.jornada) merged.push(f);
  }

  return merged;
}
