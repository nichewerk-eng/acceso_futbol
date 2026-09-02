// Liga MX Apertura 2026 — Complete schedule (17 matchdays, 153 fixtures).
// Calendar (dates / pairs) is editorial. Sportmonks fixture ids in SM_IDS are a
// bootstrap seed; `aperturaSmMap` refreshes them automatically from Sportmonks.
// Times stored as ISO 8601 with Mexico City offset:
//   CDT (UTC-5): Jul 16 – Oct 24
//   CST (UTC-6): Oct 25 – Nov 22

import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';

const TEAMS: Record<string, { name: string }> = {
  AME: { name: 'América' },
  ATS: { name: 'Atlas' },
  ATL: { name: 'Atlante' },
  CAZ: { name: 'Cruz Azul' },
  JUA: { name: 'FC Juárez' },
  GDL: { name: 'Guadalajara' },
  LEO: { name: 'León' },
  MTY: { name: 'Monterrey' },
  NCX: { name: 'Necaxa' },
  PAC: { name: 'Pachuca' },
  PUE: { name: 'Puebla' },
  UNAM: { name: 'Pumas UNAM' },
  QRO: { name: 'Querétaro' },
  SAN: { name: 'Santos' },
  ASL: { name: 'Atlético de San Luis' },
  UANL: { name: 'Tigres UANL' },
  TIJ: { name: 'Tijuana' },
  TOL: { name: 'Toluca' },
};

// [isoDate, homeAbbr, awayAbbr, jornadaNumber]
const RAW: [string, string, string, number][] = [
  // ── Jornada 1 ───────────────────────────────────────────────────────────────
  ['2026-07-16T20:00:00-05:00', 'NCX', 'ATL',  1],
  ['2026-07-16T22:00:00-05:00', 'TIJ', 'UANL',  1],
  ['2026-07-17T20:00:00-05:00', 'ASL', 'CAZ',  1],
  ['2026-07-17T20:00:00-05:00', 'LEO', 'ATS',  1],
  ['2026-07-17T22:00:00-05:00', 'JUA', 'PUE',  1],
  ['2026-07-18T18:00:00-05:00', 'UNAM', 'PAC',  1],
  ['2026-07-18T20:00:00-05:00', 'MTY', 'SAN',  1],
  ['2026-07-18T20:00:00-05:00', 'GDL', 'TOL',  1],
  ['2026-07-18T22:00:00-05:00', 'QRO', 'AME',  1],
  // ── Jornada 2 ───────────────────────────────────────────────────────────────
  ['2026-07-21T20:00:00-05:00', 'CAZ', 'PUE',  2],
  ['2026-07-21T22:00:00-05:00', 'TOL', 'UNAM',  2],
  ['2026-07-24T20:00:00-05:00', 'UANL', 'ASL',  2],
  ['2026-07-24T22:00:00-05:00', 'TIJ', 'LEO',  2],
  ['2026-07-24T22:00:00-05:00', 'ATL', 'AME',  2],
  ['2026-07-25T18:00:00-05:00', 'GDL', 'JUA',  2],
  ['2026-07-25T22:00:00-05:00', 'SAN', 'ATS',  2],
  ['2026-07-26T18:00:00-05:00', 'NCX', 'MTY',  2],
  ['2026-07-26T20:00:00-05:00', 'PAC', 'QRO',  2],
  // ── Jornada 3 ───────────────────────────────────────────────────────────────
  ['2026-07-31T20:00:00-05:00', 'PUE', 'GDL',  3],
  ['2026-07-31T22:00:00-05:00', 'JUA', 'UNAM',  3],
  ['2026-07-31T22:00:00-05:00', 'ASL', 'TIJ',  3],
  ['2026-08-01T18:00:00-05:00', 'QRO', 'UANL',  3],
  ['2026-08-01T20:00:00-05:00', 'ATS', 'MTY',  3],
  ['2026-08-01T20:00:00-05:00', 'LEO', 'PAC',  3],
  ['2026-08-01T22:00:00-05:00', 'CAZ', 'ATL',  3],
  ['2026-08-02T18:00:00-05:00', 'AME', 'SAN',  3],
  ['2026-08-02T20:00:00-05:00', 'TOL', 'NCX',  3],
  // ── Jornada 4 ───────────────────────────────────────────────────────────────
  ['2026-08-15T18:00:00-05:00', 'ATL', 'TOL',  4],
  ['2026-08-15T20:00:00-05:00', 'MTY', 'JUA',  4],
  ['2026-08-15T22:00:00-05:00', 'ATS', 'UANL',  4],
  ['2026-08-16T13:00:00-05:00', 'UNAM', 'QRO',  4],
  ['2026-08-16T18:00:00-05:00', 'AME', 'ASL',  4],
  ['2026-08-16T20:00:00-05:00', 'SAN', 'GDL',  4],
  ['2026-08-16T22:00:00-05:00', 'TIJ', 'CAZ',  4],
  ['2026-08-17T20:00:00-05:00', 'NCX', 'LEO',  4],
  ['2026-08-17T22:00:00-05:00', 'PAC', 'PUE',  4],
  // ── Jornada 5 ───────────────────────────────────────────────────────────────
  ['2026-08-21T20:00:00-05:00', 'PUE', 'SAN',  5],
  ['2026-08-21T22:00:00-05:00', 'JUA', 'AME',  5],
  ['2026-08-22T18:00:00-05:00', 'QRO', 'TOL',  5],
  ['2026-08-22T18:00:00-05:00', 'GDL', 'TIJ',  5],
  ['2026-08-22T20:00:00-05:00', 'LEO', 'MTY',  5],
  ['2026-08-22T22:00:00-05:00', 'UANL', 'ATL',  5],
  ['2026-08-22T22:00:00-05:00', 'CAZ', 'ATS',  5],
  ['2026-08-23T18:00:00-05:00', 'ASL', 'PAC',  5],
  ['2026-08-23T20:00:00-05:00', 'UNAM', 'NCX',  5],
  // ── Jornada 6 ───────────────────────────────────────────────────────────────
  ['2026-08-28T20:00:00-05:00', 'ATL', 'LEO',  6],
  ['2026-08-28T20:00:00-05:00', 'NCX', 'CAZ',  6],
  ['2026-08-28T22:00:00-05:00', 'TIJ', 'UNAM',  6],
  ['2026-08-29T18:00:00-05:00', 'ATS', 'QRO',  6],
  ['2026-08-29T18:00:00-05:00', 'PAC', 'GDL',  6],
  ['2026-08-29T20:00:00-05:00', 'AME', 'PUE',  6],
  ['2026-08-29T22:00:00-05:00', 'SAN', 'UANL',  6],
  ['2026-08-30T19:00:00-05:00', 'TOL', 'JUA',  6],
  ['2026-08-30T21:00:00-05:00', 'MTY', 'ASL',  6],
  // ── Jornada 7 ───────────────────────────────────────────────────────────────
  ['2026-09-04T20:00:00-05:00', 'PUE', 'TOL',  7],
  ['2026-09-04T22:00:00-05:00', 'JUA', 'PAC',  7],
  ['2026-09-05T18:00:00-05:00', 'ASL', 'GDL',  7],
  ['2026-09-05T18:00:00-05:00', 'QRO', 'MTY',  7],
  ['2026-09-05T20:00:00-05:00', 'UANL', 'NCX',  7],
  ['2026-09-05T20:00:00-05:00', 'AME', 'TIJ',  7],
  ['2026-09-05T22:00:00-05:00', 'ATS', 'ATL',  7],
  ['2026-09-06T13:00:00-05:00', 'UNAM', 'LEO',  7],
  ['2026-09-06T21:00:00-05:00', 'CAZ', 'SAN',  7],
  // ── Jornada 8 ───────────────────────────────────────────────────────────────
  ['2026-09-11T20:00:00-05:00', 'NCX', 'PUE',  8],
  ['2026-09-11T22:00:00-05:00', 'ATL', 'PAC',  8],
  ['2026-09-11T22:00:00-05:00', 'TIJ', 'QRO',  8],
  ['2026-09-12T01:00:00-05:00', 'TOL', 'ATS',  8],
  ['2026-09-12T01:00:00-05:00', 'CAZ', 'AME',  8],
  ['2026-09-12T18:00:00-05:00', 'LEO', 'ASL',  8],
  ['2026-09-13T19:00:00-05:00', 'GDL', 'UNAM',  8],
  ['2026-09-13T19:00:00-05:00', 'SAN', 'JUA',  8],
  ['2026-09-13T21:00:00-05:00', 'MTY', 'UANL',  8],
  // ── Jornada 9 ───────────────────────────────────────────────────────────────
  ['2026-09-18T20:00:00-05:00', 'PUE', 'ATL',  9],
  ['2026-09-18T22:00:00-05:00', 'JUA', 'UANL',  9],
  ['2026-09-19T18:00:00-05:00', 'ASL', 'NCX',  9],
  ['2026-09-19T18:00:00-05:00', 'ATS', 'UNAM',  9],
  ['2026-09-19T20:00:00-05:00', 'MTY', 'CAZ',  9],
  ['2026-09-19T22:00:00-05:00', 'AME', 'GDL',  9],
  ['2026-09-20T19:00:00-05:00', 'TOL', 'SAN',  9],
  ['2026-09-20T19:00:00-05:00', 'PAC', 'TIJ',  9],
  ['2026-09-20T21:00:00-05:00', 'QRO', 'LEO',  9],
  // ── Jornada 10 ──────────────────────────────────────────────────────────────
  ['2026-09-25T20:00:00-05:00', 'ATL', 'MTY', 10],
  ['2026-09-25T22:00:00-05:00', 'TIJ', 'ATS', 10],
  ['2026-09-26T18:00:00-05:00', 'GDL', 'QRO', 10],
  ['2026-09-26T20:00:00-05:00', 'SAN', 'PAC', 10],
  ['2026-09-26T20:00:00-05:00', 'UANL', 'PUE', 10],
  ['2026-09-26T22:00:00-05:00', 'CAZ', 'TOL', 10],
  ['2026-09-27T13:00:00-05:00', 'UNAM', 'ASL', 10],
  ['2026-09-27T20:00:00-05:00', 'LEO', 'JUA', 10],
  ['2026-09-27T22:00:00-05:00', 'NCX', 'AME', 10],
  // ── Jornada 11 ──────────────────────────────────────────────────────────────
  ['2026-10-09T20:00:00-05:00', 'PUE', 'LEO', 11],
  ['2026-10-09T20:00:00-05:00', 'QRO', 'ATL', 11],
  ['2026-10-09T22:00:00-05:00', 'UANL', 'TOL', 11],
  ['2026-10-10T18:00:00-05:00', 'JUA', 'TIJ', 11],
  ['2026-10-10T20:00:00-05:00', 'ATS', 'GDL', 11],
  ['2026-10-10T22:00:00-05:00', 'AME', 'MTY', 11],
  ['2026-10-11T18:00:00-05:00', 'PAC', 'NCX', 11],
  ['2026-10-11T18:00:00-05:00', 'ASL', 'SAN', 11],
  ['2026-10-11T20:00:00-05:00', 'UNAM', 'CAZ', 11],
  // ── Jornada 12 ──────────────────────────────────────────────────────────────
  ['2026-10-16T20:00:00-05:00', 'NCX', 'ATS', 12],
  ['2026-10-16T22:00:00-05:00', 'TIJ', 'PUE', 12],
  ['2026-10-16T22:00:00-05:00', 'ATL', 'UNAM', 12],
  ['2026-10-17T18:00:00-05:00', 'GDL', 'UANL', 12],
  ['2026-10-17T18:00:00-05:00', 'SAN', 'QRO', 12],
  ['2026-10-17T20:00:00-05:00', 'LEO', 'AME', 12],
  ['2026-10-17T20:00:00-05:00', 'TOL', 'ASL', 12],
  ['2026-10-17T22:00:00-05:00', 'CAZ', 'JUA', 12],
  ['2026-10-18T20:00:00-05:00', 'MTY', 'PAC', 12],
  // ── Jornada 13 ──────────────────────────────────────────────────────────────
  ['2026-10-20T20:00:00-05:00', 'JUA', 'ATL', 13],
  ['2026-10-20T20:00:00-05:00', 'ASL', 'QRO', 13],
  ['2026-10-20T22:00:00-05:00', 'GDL', 'NCX', 13],
  ['2026-10-20T22:00:00-05:00', 'UANL', 'LEO', 13],
  ['2026-10-21T20:00:00-05:00', 'PUE', 'MTY', 13],
  ['2026-10-21T20:00:00-05:00', 'ATS', 'AME', 13],
  ['2026-10-21T20:00:00-05:00', 'TOL', 'TIJ', 13],
  ['2026-10-21T22:00:00-05:00', 'PAC', 'CAZ', 13],
  ['2026-10-21T22:00:00-05:00', 'SAN', 'UNAM', 13],
  // ── Jornada 14 — CDT until Oct 24, CST from Oct 25 ──────────────────────────
  ['2026-10-23T20:00:00-05:00', 'NCX', 'JUA', 14],
  ['2026-10-23T22:00:00-05:00', 'ATL', 'ASL', 14],
  ['2026-10-24T18:00:00-05:00', 'LEO', 'TOL', 14],
  ['2026-10-24T20:00:00-05:00', 'MTY', 'GDL', 14],
  ['2026-10-24T22:00:00-05:00', 'UNAM', 'UANL', 14],
  ['2026-10-25T18:00:00-06:00', 'ATS', 'PUE', 14],  // CST starts
  ['2026-10-25T18:00:00-06:00', 'AME', 'PAC', 14],
  ['2026-10-25T20:00:00-06:00', 'QRO', 'CAZ', 14],
  ['2026-10-25T22:00:00-06:00', 'TIJ', 'SAN', 14],
  // ── Jornada 15 ──────────────────────────────────────────────────────────────
  ['2026-10-30T20:00:00-06:00', 'JUA', 'QRO', 15],
  ['2026-10-30T20:00:00-06:00', 'ASL', 'ATS', 15],
  ['2026-10-30T22:00:00-06:00', 'PUE', 'UNAM', 15],
  ['2026-10-31T18:00:00-06:00', 'PAC', 'UANL', 15],
  ['2026-10-31T20:00:00-06:00', 'GDL', 'ATL', 15],
  ['2026-10-31T20:00:00-06:00', 'MTY', 'TIJ', 15],
  ['2026-10-31T22:00:00-06:00', 'AME', 'TOL', 15],
  ['2026-11-01T17:00:00-06:00', 'SAN', 'NCX', 15],
  ['2026-11-01T19:00:00-06:00', 'CAZ', 'LEO', 15],
  // ── Jornada 16 ──────────────────────────────────────────────────────────────
  ['2026-11-06T19:00:00-06:00', 'NCX', 'TIJ', 16],
  ['2026-11-06T19:00:00-06:00', 'ASL', 'JUA', 16],
  ['2026-11-06T21:00:00-06:00', 'ATL', 'SAN', 16],
  ['2026-11-07T17:00:00-06:00', 'ATS', 'PAC', 16],
  ['2026-11-07T17:00:00-06:00', 'UANL', 'CAZ', 16],
  ['2026-11-07T19:00:00-06:00', 'TOL', 'MTY', 16],
  ['2026-11-07T21:00:00-06:00', 'UNAM', 'AME', 16],
  ['2026-11-08T18:00:00-06:00', 'QRO', 'PUE', 16],
  ['2026-11-08T20:00:00-06:00', 'LEO', 'GDL', 16],
  // ── Jornada 17 ──────────────────────────────────────────────────────────────
  ['2026-11-20T19:00:00-06:00', 'PUE', 'ASL', 17],
  ['2026-11-20T21:00:00-06:00', 'JUA', 'ATS', 17],
  ['2026-11-20T21:00:00-06:00', 'TIJ', 'ATL', 17],
  ['2026-11-21T17:00:00-06:00', 'SAN', 'LEO', 17],
  ['2026-11-21T17:00:00-06:00', 'PAC', 'TOL', 17],
  ['2026-11-21T19:00:00-06:00', 'UNAM', 'MTY', 17],
  ['2026-11-21T21:00:00-06:00', 'UANL', 'AME', 17],
  ['2026-11-22T17:00:00-06:00', 'GDL', 'CAZ', 17],
  ['2026-11-22T19:00:00-06:00', 'QRO', 'NCX', 17],
];

/**
 * J7 pairs parked for Leagues Cup semis / final (América, Monterrey, Toluca, León).
 * New dates TBA. Sportmonks overlay wins once it actually moves the Mexico day.
 */
const EDITORIAL_POSTPONED = new Set([
  '7|PUE|TOL',
  '7|QRO|MTY',
  '7|AME|TIJ',
  '7|UNAM|LEO',
]);

function editorialStatus(jornada: number, home: string, away: string): LigaMXFixture['status'] {
  if (EDITORIAL_POSTPONED.has(`${jornada}|${home}|${away}`)) {
    return {
      completed: false,
      state: 'pre',
      description: 'Postponed',
      shortDetail: 'Aplazado',
      displayClock: '',
    };
  }
  return {
    completed: false,
    state: 'pre',
    description: 'Scheduled',
    shortDetail: 'Por jugar',
    displayClock: '',
  };
}

/** Sportmonks fixture ids, same order as RAW. Bootstrap seed only — live map refreshes in aperturaSmMap. */
const SM_IDS: (number | null)[] = [
  19715315, 19715314, 19715313, 19715312, 19715311, 19715310, 19715308, 19715309, 19715307,
  19715306, 19715305, 19715304, 19715302, 19715303, 19715301, 19715300, 19715299, 19715298,
  19715297, 19715295, 19715296, 19715294, 19715292, 19715293, 19715291, 19715290, 19715289,
  19715288, 19715287, 19715286, 19715285, 19715284, 19715283, 19715282, 19715281, 19715280,
  19715279, 19715278, 19715277, 19715276, 19715275, 19715274, 19715273, 19715272, 19715271,
  19715269, 19715270, 19715268, 19715267, 19715266, 19715265, 19715264, 19715263, 19715262,
  19715261, 19715260, 19715259, 19715258, 19715257, 19715256, 19715255, 19715254, 19715253,
  19715250, 19715249, 19715248, 19715252, 19715251, 19715247, 19715245, 19715246, 19715244,
  19715243, 19715242, 19715240, 19715241, 19715239, 19715238, 19715236, 19715237, 19715235,
  19715234, 19715233, 19715232, 19715231, 19715230, 19715229, 19715228, 19715227, 19715226,
  19715224, 19715225, 19715223, 19715222, 19715221, 19715220, 19715219, 19715218, 19715217,
  19715216, 19715214, 19715215, 19715213, 19715212, 19715211, 19715210, 19715209, 19715208,
  19715206, 19715207, 19715204, 19715205, 19715203, 19715202, 19715201, 19715200, 19715199,
  19715198, 19715197, 19715196, 19715195, 19715194, 19715193, 19715192, 19715191, 19715190,
  19715188, 19715189, 19715187, 19715186, 19715185, 19715184, 19715183, 19715182, 19715181,
  19715179, 19715180, 19715178, 19715177, 19715176, 19715175, 19715174, 19715173, 19715172,
  19715171, 19715170, 19715169, 19715168, 19715167, 19715166, 19715165, 19715164, 19715163,
];

export function isSportmonksFixtureId(id: string): boolean {
  return /^\d{6,}$/.test(id) && !/^401\d{6,}$/.test(id);
}

/** Live Sportmonks overlay wins (postpone / renumber). Else keep a baked SM id over ESPN. */
export function preferSportmonksId(seedId: string, overlayId: string): string {
  if (isSportmonksFixtureId(overlayId)) return overlayId;
  if (isSportmonksFixtureId(seedId)) return seedId;
  return overlayId;
}

export function bakedAperturaSmMap(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < SM_IDS.length; i++) {
    const sm = SM_IDS[i];
    if (sm == null) continue;
    const staticId = `static-ap26-${i + 1}`;
    const smId = String(sm);
    out[staticId] = smId;
    out[smId] = smId;
  }
  return out;
}

export type AperturaStaticRow = {
  index: number;
  staticId: string;
  date: string;
  home: string;
  away: string;
  jornada: string | null;
};

export function aperturaStaticRows(): AperturaStaticRow[] {
  return RAW.map(([date, home, away, jornada], index) => ({
    index,
    staticId: `static-ap26-${index + 1}`,
    date,
    home,
    away,
    jornada: `Jornada ${jornada}`,
  }));
}

export const APERTURA_2026_FIXTURES: LigaMXFixture[] = RAW.map(
  ([date, homeAbbr, awayAbbr, jornada], idx) => ({
    id:      SM_IDS[idx] != null ? String(SM_IDS[idx]) : `static-ap26-${idx + 1}`,
    date,
    league:  'liga-mx' as const,
    jornada: `Jornada ${jornada}`,
    status:  editorialStatus(jornada, homeAbbr, awayAbbr),
    venue:   null,
    city:    null,
    home: { name: TEAMS[homeAbbr].name, abbreviation: homeAbbr, score: null },
    away: { name: TEAMS[awayAbbr].name, abbreviation: awayAbbr, score: null },
  }),
);

// Current jornada: the matchday whose games are next (or currently in progress)
export function getCurrentJornada(
  fixtures: { date: string; jornada: string | null; status: { state: string } }[]
): number {
  const now = Date.now();
  const live = fixtures.find((f) => f.status.state === 'in');
  if (live) return Number(live.jornada?.replace('Jornada ', '') ?? 1);
  const next = fixtures.filter((f) => f.status.state === 'pre' && new Date(f.date).getTime() > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  return Number(next?.jornada?.replace('Jornada ', '') ?? 17);
}
