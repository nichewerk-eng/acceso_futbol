'use client';
import { useState } from 'react';
import type { Group, TeamEntry, Fixture } from './types';
import { teamNameEs } from './teamNames';

// ── Hardcoded R32 bracket (from FIFA / ESPN fixture data) ──────────────────────
// Slot encoding:
//   "X1"    = Winner of Group X
//   "X2"    = Runner-up of Group X
//   "T:XYZ" = Best 3rd place from Groups X, Y, Z (Annex C)

interface R32Match {
  id: string;
  date: string;
  homeSlot: string;
  awaySlot: string;
  venue: string;
  city: string;
}

// Dates are full UTC ISO timestamps so the user's local timezone
// determines which calendar day each match appears under.
const R32: R32Match[] = [
  { id: 'r32-01', date: '2026-06-28T19:00Z', homeSlot: 'A2',  awaySlot: 'B2',      venue: 'SoFi Stadium',          city: 'Inglewood, CA'       },
  { id: 'r32-02', date: '2026-06-29T17:00Z', homeSlot: 'C1',  awaySlot: 'F2',      venue: 'NRG Stadium',           city: 'Houston, TX'         },
  { id: 'r32-03', date: '2026-06-29T20:30Z', homeSlot: 'E1',  awaySlot: 'T:ABCDF', venue: 'Gillette Stadium',      city: 'Foxborough, MA'      },
  { id: 'r32-04', date: '2026-06-30T01:00Z', homeSlot: 'F1',  awaySlot: 'C2',      venue: 'Estadio BBVA',          city: 'Guadalupe, NL'       },
  { id: 'r32-05', date: '2026-06-30T17:00Z', homeSlot: 'E2',  awaySlot: 'I2',      venue: 'AT&T Stadium',          city: 'Arlington, TX'       },
  { id: 'r32-06', date: '2026-06-30T21:00Z', homeSlot: 'I1',  awaySlot: 'T:CDFGH', venue: 'MetLife Stadium',       city: 'East Rutherford, NJ' },
  { id: 'r32-07', date: '2026-07-01T01:00Z', homeSlot: 'A1',  awaySlot: 'T:CEFHI', venue: 'Estadio Banorte',       city: 'Ciudad de México'    },
  { id: 'r32-08', date: '2026-07-01T16:00Z', homeSlot: 'L1',  awaySlot: 'T:EHIJK', venue: 'Mercedes-Benz Stadium', city: 'Atlanta, GA'         },
  { id: 'r32-09', date: '2026-07-01T20:00Z', homeSlot: 'G1',  awaySlot: 'T:AEHIJ', venue: 'Lumen Field',           city: 'Seattle, WA'         },
  { id: 'r32-10', date: '2026-07-02T00:00Z', homeSlot: 'D1',  awaySlot: 'T:BEFIJ', venue: "Levi's Stadium",        city: 'Santa Clara, CA'     },
  { id: 'r32-11', date: '2026-07-02T19:00Z', homeSlot: 'H1',  awaySlot: 'J2',      venue: 'SoFi Stadium',          city: 'Inglewood, CA'       },
  { id: 'r32-12', date: '2026-07-02T23:00Z', homeSlot: 'K2',  awaySlot: 'L2',      venue: 'BMO Field',             city: 'Toronto'             },
  { id: 'r32-13', date: '2026-07-03T03:00Z', homeSlot: 'B1',  awaySlot: 'T:EFGIJ', venue: 'BC Place',              city: 'Vancouver'           },
  { id: 'r32-14', date: '2026-07-03T18:00Z', homeSlot: 'D2',  awaySlot: 'G2',      venue: 'AT&T Stadium',          city: 'Arlington, TX'       },
  { id: 'r32-15', date: '2026-07-03T22:00Z', homeSlot: 'J1',  awaySlot: 'H2',      venue: 'Hard Rock Stadium',     city: 'Miami, FL'           },
  { id: 'r32-16', date: '2026-07-04T01:30Z', homeSlot: 'K1',  awaySlot: 'T:DEIJL', venue: 'Arrowhead Stadium',     city: 'Kansas City, MO'     },
];

// ── Flag emoji (shared with StandingsView) ─────────────────────────────────────
const FLAG: Record<string, string> = {
  MEX: '🇲🇽', KOR: '🇰🇷', CZE: '🇨🇿', RSA: '🇿🇦',
  CAN: '🇨🇦', BIH: '🇧🇦', SUI: '🇨🇭', QAT: '🇶🇦',
  BRA: '🇧🇷', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', HAI: '🇭🇹', MAR: '🇲🇦',
  PAR: '🇵🇾', TUR: '🇹🇷', AUS: '🇦🇺', USA: '🇺🇸',
  ECU: '🇪🇨', GER: '🇩🇪', CIV: '🇨🇮', CUW: '🇨🇼',
  NED: '🇳🇱', SWE: '🇸🇪', JPN: '🇯🇵', TUN: '🇹🇳',
  BEL: '🇧🇪', IRN: '🇮🇷', EGY: '🇪🇬', NZL: '🇳🇿',
  ESP: '🇪🇸', URU: '🇺🇾', KSA: '🇸🇦', CPV: '🇨🇻',
  NOR: '🇳🇴', FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶',
  ARG: '🇦🇷', AUT: '🇦🇹', ALG: '🇩🇿', JOR: '🇯🇴',
  COL: '🇨🇴', POR: '🇵🇹', UZB: '🇺🇿', COD: '🇨🇩',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', PAN: '🇵🇦', GHA: '🇬🇭',
};
const flag = (abbr: string) => FLAG[abbr] ?? '🏳️';

// ── Slot resolution ────────────────────────────────────────────────────────────

type Certainty = 'confirmed' | 'projected' | 'seeded';

interface SlotResult {
  team: TeamEntry | null;
  label: string;
  isThird: boolean;
  certainty: Certainty;
}

/**
 * Determines certainty without trusting ESPN's projection colours
 * (ESPN uses the same green for both projections and true clinches).
 *
 * Rules:
 *  - All 3 group games played → standings are final → confirmed
 *  - 6 pts after exactly 2 games (2 wins) → team has beaten both
 *    opponents it has faced; in a 4-team group this is the clearest
 *    near-clinch signal → confirmed
 *  - Any games played but not meeting above → projected
 *  - No games played → seeded (no data)
 */
function teamCertainty(
  team: TeamEntry | null | undefined,
  group: Group | undefined,
): Certainty {
  if (!team) return 'seeded';

  // All 3 group games finished → standings are final
  if (group?.entries.every((e) => e.gp >= 3)) return 'confirmed';

  // 2 wins (6 pts) after 2 games — team has already beaten 2 opponents
  if (team.gp === 2 && team.pts >= 6) return 'confirmed';

  if (team.gp > 0) return 'projected';
  return 'seeded';
}

// ── FIFA Annex C: official third-place bracket assignment ──────────────────
// Source: FIFA World Cup 26™ Regulations (May 2026), Annex C, pp. 80–97
// https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf
//
// Column order: winner of group A, B, D, E, G, I, K, L each faces a third.
// Each of the 495 rows covers one possible combination of which 8 of 12
// groups produce a qualifying third-placed team.
// Row char i = group letter of the third that faces ANNEX_C_WINNERS[i].
const ANNEX_C_WINNERS = ['A','B','D','E','G','I','K','L'] as const;

const ANNEX_C_ROWS: readonly string[] = [
 'EJIFHGLK','HGIDJFLK','EJIDHGLK','EJIDHFLK','EGIDJFLK','EGJDHFLK','EGIDHFLK',
 'EGJDHFLI','EGJDHFIK','HGICJFLK','EJICHGLK','EJICHFLK','EGICJFLK','EGJCHFLK',
 'EGICHFLK','EGJCHFLI','EGJCHFIK','HGICJDLK','CJIDHFLK','CGIDJFLK','CGJDHFLK',
 'CGIDHFLK','CGJDHFLI','CGJDHFIK','EJICHDLK','EGICJDLK','EGJCHDLK','EGICHDLK',
 'EGJCHDLI','EGJCHDIK','CJEDIFLK','CJEDHFLK','CEIDHFLK','CJEDHFLI','CJEDHFIK',
 'CGEDJFLK','CGEDIFLK','CGEDJFLI','CGEDJFIK','CGEDHFLK','CGJDHFLE','CGJDHFEK',
 'CGEDHFLI','CGEDHFIK','CGJDHFEI','HJBFIGLK','EJIBHGLK','EJBFIHLK','EJBFIGLK',
 'EJBFHGLK','EGBFIHLK','EJBFHGLI','EJBFHGIK','HJBDIGLK','HJBDIFLK','IGBDJFLK',
 'HGBDJFLK','HGBDIFLK','HGBDJFLI','HGBDJFIK','EJBDIHLK','EJBDIGLK','EJBDHGLK',
 'EGBDIHLK','EJBDHGLI','EJBDHGIK','EJBDIFLK','EJBDHFLK','EIBDHFLK','EJBDHFLI',
 'EJBDHFIK','EGBDJFLK','EGBDIFLK','EGBDJFLI','EGBDJFIK','EGBDHFLK','HGBDJFLE',
 'HGBDJFEK','EGBDHFLI','EGBDHFIK','HGBDJFEI','HJBCIGLK','HJBCIFLK','IGBCJFLK',
 'HGBCJFLK','HGBCIFLK','HGBCJFLI','HGBCJFIK','EJBCIHLK','EJBCIGLK','EJBCHGLK',
 'EGBCIHLK','EJBCHGLI','EJBCHGIK','EJBCIFLK','EJBCHFLK','EIBCHFLK','EJBCHFLI',
 'EJBCHFIK','EGBCJFLK','EGBCIFLK','EGBCJFLI','EGBCJFIK','EGBCHFLK','HGBCJFLE',
 'HGBCJFEK','EGBCHFLI','EGBCHFIK','HGBCJFEI','HJBCIDLK','IGBCJDLK','HGBCJDLK',
 'HGBCIDLK','HGBCJDLI','HGBCJDIK','CJBDIFLK','CJBDHFLK','CIBDHFLK','CJBDHFLI',
 'CJBDHFIK','CGBDJFLK','CGBDIFLK','CGBDJFLI','CGBDJFIK','CGBDHFLK','CGBDHFLJ',
 'HGBCJFDK','CGBDHFLI','CGBDHFIK','HGBCJFDI','EJBCIDLK','EJBCHDLK','EIBCHDLK',
 'EJBCHDLI','EJBCHDIK','EGBCJDLK','EGBCIDLK','EGBCJDLI','EGBCJDIK','EGBCHDLK',
 'HGBCJDLE','HGBCJDEK','EGBCHDLI','EGBCHDIK','HGBCJDEI','CJBDEFLK','CEBDIFLK',
 'CJBDEFLI','CJBDEFIK','CEBDHFLK','CJBDHFLE','CJBDHFEK','CEBDHFLI','CEBDHFIK',
 'CJBDHFEI','CGBDEFLK','CGBDJFLE','CGBDJFEK','CGBDEFLI','CGBDEFIK','CGBDJFEI',
 'CGBDHFLE','CGBDHFEK','HGBCJFDE','CGBDHFEI','HJIFAGLK','EJIAHGLK','EJIFAHLK',
 'EJIFAGLK','EGJFAHLK','EGIFAHLK','EGJFAHLI','EGJFAHIK','HJIDAGLK','HJIDAFLK',
 'IGJDAFLK','HGJDAFLK','HGIDAFLK','HGJDAFLI','HGJDAFIK','EJIDAHLK','EJIDAGLK',
 'EGJDAHLK','EGIDAHLK','EGJDAHLI','EGJDAHIK','EJIDAFLK','HJEDAFLK','HEIDAFLK',
 'HJEDAFLI','HJEDAFIK','EGJDAFLK','EGIDAFLK','EGJDAFLI','EGJDAFIK','HGEDAFLK',
 'HGJDAFLE','HGJDAFEK','HGEDAFLI','HGEDAFIK','HGJDAFEI','HJICAGLK','HJICAFLK',
 'IGJCAFLK','HGJCAFLK','HGICAFLK','HGJCAFLI','HGJCAFIK','EJICAHLK','EJICAGLK',
 'EGJCAHLK','EGICAHLK','EGJCAHLI','EGJCAHIK','EJICAFLK','HJECAFLK','HEICAFLK',
 'HJECAFLI','HJECAFIK','EGJCAFLK','EGICAFLK','EGJCAFLI','EGJCAFIK','HGECAFLK',
 'HGJCAFLE','HGJCAFEK','HGECAFLI','HGECAFIK','HGJCAFEI','HJICADLK','IGJCADLK',
 'HGJCADLK','HGICADLK','HGJCADLI','HGJCADIK','CJIDAFLK','HJFCADLK','HFICADLK',
 'HJFCADLI','HJFCADIK','CGJDAFLK','CGIDAFLK','CGJDAFLI','CGJDAFIK','HGFCADLK',
 'CGJDAFLH','HGJCAFDK','HGFCADLI','HGFCADIK','HGJCAFDI','EJICADLK','HJECADLK',
 'HEICADLK','HJECADLI','HJECADIK','EGJCADLK','EGICADLK','EGJCADLI','EGJCADIK',
 'HGECADLK','HGJCADLE','HGJCADEK','HGECADLI','HGECADIK','HGJCADEI','CJEDAFLK',
 'CEIDAFLK','CJEDAFLI','CJEDAFIK','HEFCADLK','HJFCADLE','HJECAFDK','HEFCADLI',
 'HEFCADIK','HJECAFDI','CGEDAFLK','CGJDAFLE','CGJDAFEK','CGEDAFLI','CGEDAFIK',
 'CGJDAFEI','HGFCADLE','HGECAFDK','HGJCAFDE','HGECAFDI','HJBAIGLK','HJBAIFLK',
 'IJBFAGLK','HJBFAGLK','HGBAIFLK','HJBFAGLI','HJBFAGIK','EJBAIHLK','EJBAIGLK',
 'EJBAHGLK','EGBAIHLK','EJBAHGLI','EJBAHGIK','EJBAIFLK','EJBFAHLK','EIBFAHLK',
 'EJBFAHLI','EJBFAHIK','EJBFAGLK','EGBAIFLK','EJBFAGLI','EJBFAGIK','EGBFAHLK',
 'HJBFAGLE','HJBFAGEK','EGBFAHLI','EGBFAHIK','HJBFAGEI','IJBDAHLK','IJBDAGLK',
 'HJBDAGLK','IGBDAHLK','HJBDAGLI','HJBDAGIK','IJBDAFLK','HJBDAFLK','HIBDAFLK',
 'HJBDAFLI','HJBDAFIK','FJBDAGLK','IGBDAFLK','FJBDAGLI','FJBDAGIK','HGBDAFLK',
 'HGBDAFLJ','HGBDAFJK','HGBDAFLI','HGBDAFIK','HGBDAFIJ','EJBAIDLK','EJBDAHLK',
 'EIBDAHLK','EJBDAHLI','EJBDAHIK','EJBDAGLK','EGBAIDLK','EJBDAGLI','EJBDAGIK',
 'EGBDAHLK','HJBDAGLE','HJBDAGEK','EGBDAHLI','EGBDAHIK','HJBDAGEI','EJBDAFLK',
 'EIBDAFLK','EJBDAFLI','EJBDAFIK','HEBDAFLK','HJBDAFLE','HJBDAFEK','HEBDAFLI',
 'HEBDAFIK','HJBDAFEI','EGBDAFLK','EGBDAFLJ','EGBDAFJK','EGBDAFLI','EGBDAFIK',
 'EGBDAFIJ','HGBDAFLE','HGBDAFEK','HGBDAFEJ','HGBDAFEI','IJBCAHLK','IJBCAGLK',
 'HJBCAGLK','IGBCAHLK','HJBCAGLI','HJBCAGIK','IJBCAFLK','HJBCAFLK','HIBCAFLK',
 'HJBCAFLI','HJBCAFIK','CJBFAGLK','IGBCAFLK','CJBFAGLI','CJBFAGIK','HGBCAFLK',
 'HGBCAFLJ','HGBCAFJK','HGBCAFLI','HGBCAFIK','HGBCAFIJ','EJBAICLK','EJBCAHLK',
 'EIBCAHLK','EJBCAHLI','EJBCAHIK','EJBCAGLK','EGBAICLK','EJBCAGLI','EJBCAGIK',
 'EGBCAHLK','HJBCAGLE','HJBCAGEK','EGBCAHLI','EGBCAHIK','HJBCAGEI','EJBCAFLK',
 'EIBCAFLK','EJBCAFLI','EJBCAFIK','HEBCAFLK','HJBCAFLE','HJBCAFEK','HEBCAFLI',
 'HEBCAFIK','HJBCAFEI','EGBCAFLK','EGBCAFLJ','EGBCAFJK','EGBCAFLI','EGBCAFIK',
 'EGBCAFIJ','HGBCAFLE','HGBCAFEK','HGBCAFEJ','HGBCAFEI','IJBCADLK','HJBCADLK',
 'HIBCADLK','HJBCADLI','HJBCADIK','CJBDAGLK','IGBCADLK','CJBDAGLI','CJBDAGIK',
 'HGBCADLK','HGBCADLJ','HGBCADJK','HGBCADLI','HGBCADIK','HGBCADIJ','CJBDAFLK',
 'CIBDAFLK','CJBDAFLI','CJBDAFIK','HFBCADLK','CJBDAFLH','HJBCAFDK','HFBCADLI',
 'HFBCADIK','HJBCAFDI','CGBDAFLK','CGBDAFLJ','CGBDAFJK','CGBDAFLI','CGBDAFIK',
 'CGBDAFIJ','CGBDAFLH','HGBCAFDK','HGBCAFDJ','HGBCAFDI','EJBCADLK','EIBCADLK',
 'EJBCADLI','EJBCADIK','HEBCADLK','HJBCADLE','HJBCADEK','HEBCADLI','HEBCADIK',
 'HJBCADEI','EGBCADLK','EGBCADLJ','EGBCADJK','EGBCADLI','EGBCADIK','EGBCADIJ',
 'HGBCADLE','HGBCADEK','HGBCADEJ','HGBCADEI','CEBDAFLK','CJBDAFLE','CJBDAFEK',
 'CEBDAFLI','CEBDAFIK','CJBDAFEI','HFBCADLE','HEBCAFDK','HJBCAFDE','HEBCAFDI',
 'CGBDAFLE','CGBDAFEK','CGBDAFEJ','CGBDAFEI','HGBCAFDE',
];

// Maps each winner letter to the R32 slot string it corresponds to in our R32 array.
// Derived from the R32 array: whichever match has homeSlot = 'X1', its awaySlot is here.
const WINNER_TO_SLOT: Record<string, string> = {
  A: 'T:CEFHI',  // r32-07: A1 vs T:CEFHI
  B: 'T:EFGIJ',  // r32-13: B1 vs T:EFGIJ
  D: 'T:BEFIJ',  // r32-10: D1 vs T:BEFIJ
  E: 'T:ABCDF',  // r32-03: E1 vs T:ABCDF
  G: 'T:AEHIJ',  // r32-09: G1 vs T:AEHIJ
  I: 'T:CDFGH',  // r32-06: I1 vs T:CDFGH
  K: 'T:DEIJL',  // r32-16: K1 vs T:DEIJL
  L: 'T:EHIJK',  // r32-08: L1 vs T:EHIJK
};

// Fallback slot order used when Annex C cannot yet resolve (< 8 groups determined)
const THIRD_SLOTS = [
  'T:ABCDF', 'T:CDFGH', 'T:CEFHI', 'T:EHIJK',
  'T:AEHIJ', 'T:BEFIJ', 'T:EFGIJ', 'T:DEIJL',
] as const;

/**
 * Pre-compute all 8 third-place slot assignments using the official FIFA
 * Annex C lookup table (495 rows — one per possible combination of which
 * 8 of the 12 groups produce a qualifying third-placed team).
 *
 * Falls back to the greedy eligibility approach only when the top-8
 * combination cannot yet be determined (e.g. early tournament stage
 * where fewer than 8 groups have distinct standings).
 */
function computeThirdAssignments(groups: Group[]): Map<string, TeamEntry | null> {
  const teamToGroup = new Map<string, string>();
  for (const group of groups) {
    const letter = group.abbreviation.replace('Group ', '');
    for (const entry of group.entries) teamToGroup.set(entry.team.id, letter);
  }

  const allThirds = groups
    .flatMap((g) => g.entries.filter((e) => e.position === 3))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const gdA = Number(a.gd), gdB = Number(b.gd);
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

  const top8 = allThirds.slice(0, 8);

  // Build group-letter → third-team map for the top 8
  const thirdByGroup = new Map<string, TeamEntry>();
  const comboLetters: string[] = [];
  for (const t of top8) {
    const gl = teamToGroup.get(t.team.id);
    if (gl) { thirdByGroup.set(gl, t); comboLetters.push(gl); }
  }

  const assignments = new Map<string, TeamEntry | null>();
  const combo = new Set(comboLetters);

  // ── Annex C lookup (exact, official) ───────────────────────────────────
  if (combo.size === 8) {
    for (const row of ANNEX_C_ROWS) {
      const rowLetters = new Set(row);
      if (rowLetters.size === 8 && [...rowLetters].every((c) => combo.has(c))) {
        ANNEX_C_WINNERS.forEach((winner, i) => {
          const slot = WINNER_TO_SLOT[winner];
          assignments.set(slot, thirdByGroup.get(row[i]) ?? null);
        });
        return assignments;
      }
    }
  }

  // ── Greedy fallback (when combination is not yet fully determined) ──────
  const usedIds = new Set<string>();
  for (const slot of THIRD_SLOTS) {
    const eligible = new Set(slot.slice(2).split(''));
    const best =
      top8.find((t) => {
        const gl = teamToGroup.get(t.team.id);
        return gl && eligible.has(gl) && !usedIds.has(t.team.id);
      }) ?? null;
    assignments.set(slot, best);
    if (best) usedIds.add(best.team.id);
  }

  return assignments;
}

function resolveSlot(
  slot: string,
  groupMap: Map<string, Group>,
  thirdAssignments: Map<string, TeamEntry | null>,
): SlotResult {
  // Winner  e.g. "A1"
  if (/^[A-L]1$/.test(slot)) {
    const g    = groupMap.get(slot[0]);
    const team = g?.entries.find((e) => e.position === 1) ?? null;
    return {
      team,
      label: `1° Gr. ${slot[0]}`,
      isThird: false,
      certainty: teamCertainty(team, g),
    };
  }

  // Runner-up  e.g. "A2"
  if (/^[A-L]2$/.test(slot)) {
    const g    = groupMap.get(slot[0]);
    const team = g?.entries.find((e) => e.position === 2) ?? null;
    return {
      team,
      label: `2° Gr. ${slot[0]}`,
      isThird: false,
      certainty: teamCertainty(team, g),
    };
  }

  // Best 3rd  e.g. "T:ABCDF" — use pre-computed deduplicated assignment
  if (slot.startsWith('T:')) {
    const groupLetters = slot.slice(2).split('').join('/');
    const team = thirdAssignments.get(slot) ?? null;
    // Find the team's own group to check if all games are done
    const teamGroup = team
      ? [...groupMap.values()].find((g) =>
          g.entries.some((e) => e.team.id === team.team.id),
        )
      : undefined;
    const certainty = teamCertainty(team, teamGroup);
    return {
      team,
      label: `Mejor 3° (${groupLetters})`,
      isThird: true,
      certainty,
    };
  }

  return { team: null, label: slot, isThird: false, certainty: 'seeded' };
}

// ── All-thirds ranking (for the live leaderboard) ─────────────────────────────
interface RankedThird {
  rank: number;
  qualifies: boolean;
  team: TeamEntry;
  group: string;
  groupDone: boolean; // all 3 group games finished
}

function rankAllThirds(groups: Group[]): RankedThird[] {
  const teamToGroup = new Map<string, string>();
  const groupDoneMap = new Map<string, boolean>();
  for (const group of groups) {
    const letter = group.abbreviation.replace('Group ', '');
    const done = group.entries.every((e) => e.gp >= 3);
    groupDoneMap.set(letter, done);
    for (const entry of group.entries) teamToGroup.set(entry.team.id, letter);
  }

  const thirds = groups.flatMap((g) => g.entries.filter((e) => e.position === 3));
  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = Number(a.gd), gdB = Number(b.gd);
    if (gdB !== gdA) return gdB - gdA;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return 0;
  });

  return thirds.map((t, i) => {
    const grp = teamToGroup.get(t.team.id) ?? '?';
    return {
      rank: i + 1,
      qualifies: i < 8,
      team: t,
      group: grp,
      groupDone: groupDoneMap.get(grp) ?? false,
    };
  });
}

// ── Date formatting ────────────────────────────────────────────────────────────
function fmtMatchDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    timeZone: tz,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// Returns a YYYY-MM-DD key in the user's local timezone for grouping matches by day
function localDateKey(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: tz });
}

// ── Team slot card ─────────────────────────────────────────────────────────────
function TeamSlot({
  result,
  align,
}: {
  result: SlotResult;
  align: 'left' | 'right';
}) {
  const { team, label, certainty } = result;
  const isRight = align === 'right';

  const nameColor =
    certainty === 'confirmed'
      ? 'text-gray-900 dark:text-white'
      : certainty === 'projected'
        ? 'text-gray-700 dark:text-white/80'
        : 'text-gray-400 dark:text-white/40';

  const certBadge =
    certainty === 'confirmed'
      ? { text: 'Confirmado', cls: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' }
      : certainty === 'projected'
        ? { text: 'Proyectado', cls: 'bg-brand-orange/15 text-brand-orange' }
        : { text: 'Sin definir', cls: 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/25' };

  return (
    <div
      className={[
        'flex min-w-0 flex-1 flex-col gap-1',
        isRight ? 'items-end text-right' : 'items-start text-left',
      ].join(' ')}
    >
      {/* Flag + name */}
      <div
        className={[
          'flex items-center gap-2',
          isRight ? 'flex-row-reverse' : '',
        ].join(' ')}
      >
        <span className="text-2xl leading-none">
          {team ? flag(team.team.abbreviation) : '–'}
        </span>
        <span className={['text-sm font-bold truncate max-w-[100px] sm:max-w-[140px]', nameColor].join(' ')}>
          {team ? teamNameEs(team.team.name) : '—'}
        </span>
      </div>

      {/* Slot label */}
      <span className="text-[10px] text-gray-400 dark:text-white/30 font-medium">{label}</span>

      {/* Stats row */}
      {team && team.gp > 0 && (
        <span className="text-[10px] text-gray-400 dark:text-white/40">
          {team.gp}PJ · {team.pts}pts · DG {team.gd}
        </span>
      )}

      {/* Certainty badge */}
      <span
        className={[
          'inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase',
          certBadge.cls,
        ].join(' ')}
      >
        {certBadge.text}
      </span>
    </div>
  );
}

// ── Best thirds leaderboard ────────────────────────────────────────────────────
function BestThirdsTable({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(true);
  const ranked = rankAllThirds(groups);
  const anyPlayed = ranked.some((r) => r.team.gp > 0);
  if (!anyPlayed) return null;

  return (
    <div className="mb-8 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold tracking-[0.18em] uppercase text-gray-500 dark:text-white/40">
            Mejores Terceros
          </span>
          <span className="rounded bg-brand-teal/15 text-brand-teal px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
            Top 8 clasifican
          </span>
        </div>
        <svg
          className={[
            'h-4 w-4 text-gray-400 dark:text-white/30 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="overflow-x-auto">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_2rem_2rem_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-1 px-4 pb-1 text-[9px] font-bold tracking-widest uppercase text-gray-400 dark:text-white/25">
            <span className="text-center">#</span>
            <span>Equipo</span>
            <span className="text-center">Gr</span>
            <span className="text-center">PJ</span>
            <span className="text-center">Pts</span>
            <span className="text-center">DG</span>
            <span className="text-center">GF</span>
            <span className="text-center">Estado</span>
          </div>

          <div>
            {ranked.map((r, i) => {
              const isIn = r.qualifies;
              const isCutline = i === 8; // first OUT row

              // Certainty for badge
              const confirmed = isIn && r.groupDone;
              const projected = isIn && !r.groupDone;
              const bubble =
                !isIn &&
                !r.groupDone &&
                ranked[7] &&
                (r.team.pts >= ranked[7].team.pts);

              return (
                <div key={r.team.team.id}>
                  {/* Cutline separator */}
                  {isCutline && (
                    <div className="mx-4 my-0.5 flex items-center gap-2">
                      <div className="h-px flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
                      <span className="text-[8px] font-bold tracking-widest uppercase text-gray-300 dark:text-white/20">
                        eliminados
                      </span>
                      <div className="h-px flex-1 border-t border-dashed border-gray-300 dark:border-white/10" />
                    </div>
                  )}

                  <div
                    className={[
                      'grid grid-cols-[2rem_1fr_2rem_2rem_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-1 px-4 py-2 items-center',
                      isIn
                        ? 'border-l-2 border-emerald-500/40'
                        : 'border-l-2 border-transparent',
                      confirmed
                        ? 'bg-emerald-500/[0.04]'
                        : isIn
                          ? ''
                          : 'opacity-50',
                    ].join(' ')}
                  >
                    {/* Rank */}
                    <span
                      className={[
                        'text-center text-xs font-bold tabular-nums',
                        isIn
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-gray-300 dark:text-white/20',
                      ].join(' ')}
                    >
                      {r.rank}
                    </span>

                    {/* Flag + name */}
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="text-base leading-none shrink-0">
                        {flag(r.team.team.abbreviation)}
                      </span>
                      <span
                        className={[
                          'truncate text-xs font-semibold',
                          isIn
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-400 dark:text-white/40',
                        ].join(' ')}
                      >
                        {teamNameEs(r.team.team.name)}
                      </span>
                    </div>

                    {/* Group */}
                    <span className="text-center text-[10px] font-bold text-gray-400 dark:text-white/30">
                      {r.group}
                    </span>

                    {/* PJ */}
                    <span className="text-center text-[10px] tabular-nums text-gray-500 dark:text-white/40">
                      {r.team.gp}
                    </span>

                    {/* Pts */}
                    <span
                      className={[
                        'text-center text-xs font-bold tabular-nums',
                        isIn
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-white/30',
                      ].join(' ')}
                    >
                      {r.team.pts}
                    </span>

                    {/* DG */}
                    <span
                      className={[
                        'text-center text-[10px] tabular-nums',
                        Number(r.team.gd) > 0
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : Number(r.team.gd) < 0
                            ? 'text-red-400'
                            : 'text-gray-400 dark:text-white/30',
                      ].join(' ')}
                    >
                      {Number(r.team.gd) > 0 ? '+' : ''}{r.team.gd}
                    </span>

                    {/* GF */}
                    <span className="text-center text-[10px] tabular-nums text-gray-400 dark:text-white/30">
                      {r.team.gf}
                    </span>

                    {/* Status badge */}
                    <span
                      className={[
                        'text-center text-[8px] font-bold tracking-wide uppercase rounded px-1 py-0.5',
                        confirmed
                          ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                          : projected
                            ? 'bg-brand-orange/15 text-brand-orange'
                            : bubble
                              ? 'bg-yellow-400/15 text-yellow-500 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-white/20',
                      ].join(' ')}
                    >
                      {confirmed ? '✓' : projected ? '~' : bubble ? '!' : '✗'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2.5 border-t border-gray-100 dark:border-white/[0.04]">
            <span className="text-[8px] text-gray-400 dark:text-white/25">
              <span className="font-bold text-emerald-500">✓</span> Confirmado
            </span>
            <span className="text-[8px] text-gray-400 dark:text-white/25">
              <span className="font-bold text-brand-orange">~</span> Proyectado
            </span>
            <span className="text-[8px] text-gray-400 dark:text-white/25">
              <span className="font-bold text-yellow-500">!</span> En la cuerda
            </span>
            <span className="text-[8px] text-gray-400 dark:text-white/25">
              <span className="font-bold text-gray-300 dark:text-white/20">✗</span> Eliminado
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match fixture lookup (by date proximity — R32 games in the fixtures array) ──
function findFixture(match: R32Match, fixtures: Fixture[]): Fixture | undefined {
  const matchMs = new Date(match.date).getTime();
  return fixtures.find((f) => Math.abs(new Date(f.date).getTime() - matchMs) < 90 * 60 * 1000);
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  groups: Group[];
  userTz: string;
  fixtures?: Fixture[];
}

export default function BracketView({ groups, userTz, fixtures = [] }: Props) {
  const groupMap = new Map(
    groups.map((g) => [g.abbreviation.replace('Group ', ''), g]),
  );

  // Pre-compute deduplicated third-place assignments once
  const thirdAssignments = computeThirdAssignments(groups);

  // Group matches by date for section headers
  // Group by the user's local calendar date (not UTC date)
  const byDate = R32.reduce<Record<string, R32Match[]>>((acc, m) => {
    const key = localDateKey(m.date, userTz);
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      {/* ── Legend ── */}
      <div className="mb-5 flex flex-wrap gap-3">
        <LegendBadge cls="bg-emerald-500/15 text-emerald-400" label="Confirmado — clasificado" />
        <LegendBadge cls="bg-brand-orange/15 text-brand-orange" label="Proyectado — en juego" />
        <LegendBadge cls="bg-white/5 dark:bg-white/5 bg-gray-100 text-gray-400 dark:text-white/25" label="Sin definir — jornada no iniciada" />
      </div>

      {/* ── Best thirds live leaderboard ── */}
      <BestThirdsTable groups={groups} />

      {/* ── Matches grouped by date ── */}
      {Object.entries(byDate).map(([date, matches]) => (
        <div key={date} className="mb-8">
          {/* Date header */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 dark:text-white/40">
              {fmtMatchDate(matches[0].date, userTz)}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/[0.06]" />
          </div>

          {/* Match cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {matches.map((match) => {
              const home = resolveSlot(match.homeSlot, groupMap, thirdAssignments);
              const away = resolveSlot(match.awaySlot, groupMap, thirdAssignments);
              const fixture = findFixture(match, fixtures);
              const isLive  = fixture?.status.state === 'in';
              const isDone  = fixture?.status.state === 'post';
              const homeScore = fixture?.home.score ?? null;
              const awayScore = fixture?.away.score ?? null;
              const homeWin = isDone && Number(homeScore) > Number(awayScore);
              const awayWin = isDone && Number(awayScore) > Number(homeScore);

              const mexInvolved =
                home.team?.team.abbreviation === 'MEX' ||
                away.team?.team.abbreviation === 'MEX';

              return (
                <div
                  key={match.id}
                  className={[
                    'relative overflow-hidden rounded-2xl border transition-all',
                    isLive
                      ? 'border-red-500/30 bg-red-500/[0.03] shadow-[0_0_24px_rgba(239,68,68,0.08)]'
                      : mexInvolved
                        ? 'border-brand-orange/30 bg-brand-orange/[0.04] shadow-[0_0_20px_rgba(240,120,32,0.08)]'
                        : isDone
                          ? 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]'
                          : 'border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none',
                  ].join(' ')}
                >
                  {mexInvolved && !isLive && (
                    <div className="pointer-events-none absolute inset-0 opacity-10"
                      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, #f07820, transparent)' }} />
                  )}

                  {/* ── Card header: status badge + city ── */}
                  <div className="flex items-center justify-between px-4 pt-3.5 pb-0">
                    <div>
                      {isLive ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                          {fixture?.status.shortDetail ?? 'En vivo'}
                        </span>
                      ) : isDone ? (
                        <span className="rounded bg-gray-100 dark:bg-white/[0.07] px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:text-white/40">FT</span>
                      ) : (
                        <span className={['rounded px-2 py-0.5 text-[10px] font-bold',
                          mexInvolved
                            ? 'bg-brand-orange/15 text-brand-orange'
                            : 'bg-[#1a7a78]/10 text-[#1a7a78] dark:text-[#4db8b5]'].join(' ')}>
                          {new Date(match.date).toLocaleTimeString('es-MX', { timeZone: userTz, hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-white/20 truncate ml-2">{match.city}</span>
                  </div>

                  {/* ── Teams + score ── */}
                  <div className="flex items-center gap-2 px-4 py-4">
                    {/* Home */}
                    <div className={['flex flex-1 flex-col items-start gap-1', awayWin ? 'opacity-50' : ''].join(' ')}>
                      <span className="text-2xl leading-none">{home.team ? flag(home.team.team.abbreviation) : '🏳️'}</span>
                      <span className={['text-xs font-bold leading-tight',
                        home.certainty === 'confirmed' ? 'text-gray-900 dark:text-white'
                          : home.certainty === 'projected' ? 'text-gray-600 dark:text-white/70'
                          : 'text-gray-400 dark:text-white/30'].join(' ')}>
                        {home.team ? teamNameEs(home.team.team.name) : home.label}
                      </span>
                      {home.certainty !== 'seeded' && (
                        <span className={['text-[9px] font-bold uppercase tracking-wider',
                          home.certainty === 'confirmed' ? 'text-emerald-500' : 'text-brand-orange'].join(' ')}>
                          {home.certainty === 'confirmed' ? 'Confirmado' : 'Proyectado'}
                        </span>
                      )}
                    </div>

                    {/* Score / vs */}
                    <div className="shrink-0 text-center px-1">
                      {(isLive || isDone) && homeScore !== null ? (
                        <span className={['text-2xl font-bold tabular-nums',
                          isLive ? 'text-red-400' : 'text-gray-900 dark:text-white'].join(' ')}>
                          {homeScore}<span className="mx-1 text-gray-300 dark:text-white/20">–</span>{awayScore}
                        </span>
                      ) : (
                        <span className="text-sm font-bold text-gray-300 dark:text-white/20">vs</span>
                      )}
                    </div>

                    {/* Away */}
                    <div className={['flex flex-1 flex-col items-end gap-1', homeWin ? 'opacity-50' : ''].join(' ')}>
                      <span className="text-2xl leading-none">{away.team ? flag(away.team.team.abbreviation) : '🏳️'}</span>
                      <span className={['text-xs font-bold leading-tight text-right',
                        away.certainty === 'confirmed' ? 'text-gray-900 dark:text-white'
                          : away.certainty === 'projected' ? 'text-gray-600 dark:text-white/70'
                          : 'text-gray-400 dark:text-white/30'].join(' ')}>
                        {away.team ? teamNameEs(away.team.team.name) : away.label}
                      </span>
                      {away.certainty !== 'seeded' && (
                        <span className={['text-[9px] font-bold uppercase tracking-wider',
                          away.certainty === 'confirmed' ? 'text-emerald-500' : 'text-brand-orange'].join(' ')}>
                          {away.certainty === 'confirmed' ? 'Confirmado' : 'Proyectado'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Footer: venue + Mexico tag ── */}
                  <div className={['flex items-center px-4 pb-3',
                    mexInvolved ? 'justify-between' : 'justify-end'].join(' ')}>
                    {mexInvolved && (
                      <span className="text-[10px] font-bold tracking-widest uppercase text-brand-orange/70">
                        🇲🇽 El Tri
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 dark:text-white/20 truncate">{match.venue}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="mt-4 text-center text-[10px] text-gray-400 dark:text-white/20">
        Proyecciones basadas en la tabla actual · Se actualiza cada 30 segundos
      </p>
    </div>
  );
}

function LegendBadge({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={['inline-block rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase', cls].join(' ')}>
        ●
      </span>
      <span className="text-[10px] text-gray-400 dark:text-white/30">{label}</span>
    </div>
  );
}
