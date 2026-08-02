import { APERTURA_2026_FIXTURES } from '@/fixtures/ligamx-apertura-2026';
import { mexicoDayKey } from '@/lib/radio/phases';

/** Minimal fixture shape shared by API + Liga MX UI. */
export type LigaMxScheduleFixture = {
  id: string;
  date: string;
  league: 'liga-mx';
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

/** ESPN abbreviations → static Apertura schedule abbreviations. */
const ESPN_ABBR: Record<string, string> = {
  NCX: 'NEC',
  UNAM: 'PUM',
  UANL: 'TIG',
  ASL: 'SLP',
  ATS: 'ATL', // Atlas
  ATL: 'ALT', // Atlante (ESPN); static Atlas stays ATL
};

function espnAbbr(abbr: string): string {
  return ESPN_ABBR[abbr] ?? abbr;
}

function dayPairKey(dateIso: string, homeAbbr: string, awayAbbr: string): string {
  return `${mexicoDayKey(new Date(dateIso))}|${homeAbbr}|${awayAbbr}`;
}

/**
 * Static schedule owns jornada labels + full calendar.
 * ESPN overlays live state, scores, and real event ids (matched by MX day + abbr).
 */
export function mergeLigaMxSchedule(espn: LigaMxScheduleFixture[]): LigaMxScheduleFixture[] {
  if (espn.length === 0) return APERTURA_2026_FIXTURES;

  const byKey = new Map(
    espn.map((f) => [
      dayPairKey(f.date, espnAbbr(f.home.abbreviation), espnAbbr(f.away.abbreviation)),
      f,
    ])
  );
  const used = new Set<string>();

  const merged = APERTURA_2026_FIXTURES.map((s) => {
    const key = dayPairKey(s.date, s.home.abbreviation, s.away.abbreviation);
    const live = byKey.get(key);
    if (!live) return s;
    used.add(key);
    return {
      ...s,
      id: live.id,
      date: live.date,
      status: live.status,
      venue: live.venue ?? s.venue,
      city: live.city ?? s.city,
      home: { ...s.home, score: live.home.score },
      away: { ...s.away, score: live.away.score },
    };
  });

  for (const f of espn) {
    const key = dayPairKey(f.date, espnAbbr(f.home.abbreviation), espnAbbr(f.away.abbreviation));
    if (!used.has(key) && f.jornada) merged.push(f);
  }

  return merged;
}
