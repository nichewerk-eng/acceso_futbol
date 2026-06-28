'use client';

import { useState, useMemo } from 'react';
import type { Group, TeamEntry } from './types';
import { teamNameEs } from './teamNames';

// ── Flag map ────────────────────────────────────────────────────────────────
const FLAG: Record<string, string> = {
  MEX:'🇲🇽',KOR:'🇰🇷',CZE:'🇨🇿',RSA:'🇿🇦',CAN:'🇨🇦',BIH:'🇧🇦',SUI:'🇨🇭',QAT:'🇶🇦',
  BRA:'🇧🇷',SCO:'🏴󠁧󠁢󠁳󠁣󠁴󠁿',HAI:'🇭🇹',MAR:'🇲🇦',PAR:'🇵🇾',TUR:'🇹🇷',AUS:'🇦🇺',USA:'🇺🇸',
  ECU:'🇪🇨',GER:'🇩🇪',CIV:'🇨🇮',CUW:'🇨🇼',NED:'🇳🇱',SWE:'🇸🇪',JPN:'🇯🇵',TUN:'🇹🇳',
  BEL:'🇧🇪',IRN:'🇮🇷',EGY:'🇪🇬',NZL:'🇳🇿',ESP:'🇪🇸',URU:'🇺🇾',KSA:'🇸🇦',CPV:'🇨🇻',
  NOR:'🇳🇴',FRA:'🇫🇷',SEN:'🇸🇳',IRQ:'🇮🇶',ARG:'🇦🇷',AUT:'🇦🇹',ALG:'🇩🇿',JOR:'🇯🇴',
  COL:'🇨🇴',POR:'🇵🇹',UZB:'🇺🇿',COD:'🇨🇩',ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',CRO:'🇭🇷',PAN:'🇵🇦',GHA:'🇬🇭',
};
const flag = (a: string) => FLAG[a] ?? '🏳️';

// ── Annex C (same table as BracketView) ─────────────────────────────────────
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

const WINNER_TO_SLOT: Record<string, string> = {
  A:'T:CEFHI', B:'T:EFGIJ', D:'T:BEFIJ', E:'T:ABCDF',
  G:'T:AEHIJ', I:'T:CDFGH', K:'T:DEIJL', L:'T:EHIJK',
};
const THIRD_SLOTS = ['T:ABCDF','T:CDFGH','T:CEFHI','T:EHIJK','T:AEHIJ','T:BEFIJ','T:EFGIJ','T:DEIJL'] as const;

// ── R32 bracket definition ───────────────────────────────────────────────────
const R32_DEFS = [
  { id:'r01', homeSlot:'A2',  awaySlot:'B2',      label:'16vos · 28 Jun' },
  { id:'r02', homeSlot:'C1',  awaySlot:'F2',      label:'16vos · 29 Jun' },
  { id:'r03', homeSlot:'E1',  awaySlot:'T:ABCDF', label:'16vos · 29 Jun' },
  { id:'r04', homeSlot:'F1',  awaySlot:'C2',      label:'16vos · 29 Jun' },
  { id:'r05', homeSlot:'E2',  awaySlot:'I2',      label:'16vos · 30 Jun' },
  { id:'r06', homeSlot:'I1',  awaySlot:'T:CDFGH', label:'16vos · 30 Jun' },
  { id:'r07', homeSlot:'A1',  awaySlot:'T:CEFHI', label:'16vos · 30 Jun' },
  { id:'r08', homeSlot:'L1',  awaySlot:'T:EHIJK', label:'16vos · 1 Jul'  },
  { id:'r09', homeSlot:'G1',  awaySlot:'T:AEHIJ', label:'16vos · 1 Jul'  },
  { id:'r10', homeSlot:'D1',  awaySlot:'T:BEFIJ', label:'16vos · 2 Jul'  },
  { id:'r11', homeSlot:'H1',  awaySlot:'J2',      label:'16vos · 2 Jul'  },
  { id:'r12', homeSlot:'K2',  awaySlot:'L2',      label:'16vos · 2 Jul'  },
  { id:'r13', homeSlot:'B1',  awaySlot:'T:EFGIJ', label:'16vos · 3 Jul'  },
  { id:'r14', homeSlot:'D2',  awaySlot:'G2',      label:'16vos · 3 Jul'  },
  { id:'r15', homeSlot:'J1',  awaySlot:'H2',      label:'16vos · 3 Jul'  },
  { id:'r16', homeSlot:'K1',  awaySlot:'T:DEIJL', label:'16vos · 4 Jul'  },
];

// R16 pairings: each pair of R32 match winners
// R16-i = Winner(R32[2i]) vs Winner(R32[2i+1])
const R16_LABELS = ['Oct · 5 Jul','Oct · 5 Jul','Oct · 6 Jul','Oct · 6 Jul','Oct · 7 Jul','Oct · 7 Jul','Oct · 8 Jul','Oct · 8 Jul'];
const QF_LABELS  = ['Ctos · 11 Jul','Ctos · 11 Jul','Ctos · 12 Jul','Ctos · 12 Jul'];
const SF_LABELS  = ['Semis · 15 Jul','Semis · 16 Jul'];
const F_LABEL    = 'Final · 19 Jul';

// ── Types ────────────────────────────────────────────────────────────────────
interface BTeam {
  name: string;
  abbr: string;
  flag: string;
}

interface BMatch {
  id: string;
  label: string;
  home: BTeam | null;
  away: BTeam | null;
}

type Side = 'home' | 'away';
// picks key: `${roundIdx}-${matchIdx}` → side picked
type Picks = Record<string, Side>;

// ── Slot → TeamEntry resolution ──────────────────────────────────────────────
function resolveTeam(slot: string, groupMap: Map<string, Group>, thirds: Map<string, TeamEntry | null>): BTeam | null {
  const entryToTeam = (e: TeamEntry | null | undefined): BTeam | null => {
    if (!e) return null;
    return {
      name: teamNameEs(e.team.name),
      abbr: e.team.abbreviation,
      flag: flag(e.team.abbreviation),
    };
  };

  if (/^[A-L]1$/.test(slot)) {
    const g = groupMap.get(slot[0]);
    return entryToTeam(g?.entries.find(e => e.position === 1));
  }
  if (/^[A-L]2$/.test(slot)) {
    const g = groupMap.get(slot[0]);
    return entryToTeam(g?.entries.find(e => e.position === 2));
  }
  if (slot.startsWith('T:')) {
    return entryToTeam(thirds.get(slot) ?? null);
  }
  return null;
}

function computeThirds(groups: Group[]): Map<string, TeamEntry | null> {
  const teamToGroup = new Map<string, string>();
  for (const g of groups) {
    const letter = g.abbreviation.replace('Group ', '');
    for (const e of g.entries) teamToGroup.set(e.team.id, letter);
  }

  const allThirds = groups
    .flatMap(g => g.entries.filter(e => e.position === 3))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const diff = Number(b.gd) - Number(a.gd);
      return diff !== 0 ? diff : b.gf - a.gf;
    });

  const top8 = allThirds.slice(0, 8);
  const thirdByGroup = new Map<string, TeamEntry>();
  const comboLetters: string[] = [];
  for (const t of top8) {
    const gl = teamToGroup.get(t.team.id);
    if (gl) { thirdByGroup.set(gl, t); comboLetters.push(gl); }
  }

  const assignments = new Map<string, TeamEntry | null>();
  const combo = new Set(comboLetters);

  if (combo.size === 8) {
    for (const row of ANNEX_C_ROWS) {
      const rowSet = new Set(row);
      if (rowSet.size === 8 && [...rowSet].every(c => combo.has(c))) {
        ANNEX_C_WINNERS.forEach((winner, i) => {
          const slot = WINNER_TO_SLOT[winner];
          assignments.set(slot, thirdByGroup.get(row[i]) ?? null);
        });
        return assignments;
      }
    }
  }

  const usedIds = new Set<string>();
  for (const slot of THIRD_SLOTS) {
    const eligible = new Set(slot.slice(2).split(''));
    const best = top8.find(t => {
      const gl = teamToGroup.get(t.team.id);
      return gl && eligible.has(gl) && !usedIds.has(t.team.id);
    }) ?? null;
    assignments.set(slot, best);
    if (best) usedIds.add(best.team.id);
  }
  return assignments;
}

function buildR32(groups: Group[]): BMatch[] {
  const groupMap = new Map<string, Group>();
  for (const g of groups) {
    const letter = g.abbreviation.replace('Group ', '');
    groupMap.set(letter, g);
  }
  const thirds = computeThirds(groups);

  return R32_DEFS.map(def => ({
    id: def.id,
    label: def.label,
    home: resolveTeam(def.homeSlot, groupMap, thirds),
    away: resolveTeam(def.awaySlot, groupMap, thirds),
  }));
}

// ── Bracket computation ──────────────────────────────────────────────────────
interface RoundData {
  name: string;
  shortName: string;
  matches: BMatch[];
}

function computeBracket(r32: BMatch[], picks: Picks): RoundData[] {
  const getWinner = (roundIdx: number, matchIdx: number, matches: BMatch[]): BTeam | null => {
    const key = `${roundIdx}-${matchIdx}`;
    const side = picks[key];
    if (!side) return null;
    const m = matches[matchIdx];
    return side === 'home' ? m.home : m.away;
  };

  const rounds: RoundData[] = [
    { name: '16vos de Final', shortName: '16vos', matches: r32 },
  ];

  const roundLabelsMap = [R16_LABELS, QF_LABELS, SF_LABELS, [F_LABEL]];
  const roundNames    = ['Octavos de Final', 'Cuartos de Final', 'Semifinales', 'Final'];
  const roundShorts   = ['Octavos', 'Cuartos', 'Semis', 'Final'];

  let prevMatches = r32;
  for (let r = 0; r < 4; r++) {
    const labels = roundLabelsMap[r];
    const nextMatches: BMatch[] = [];
    for (let m = 0; m < prevMatches.length / 2; m++) {
      const homeParentIdx = m * 2;
      const awayParentIdx = m * 2 + 1;
      nextMatches.push({
        id: `${r + 1}-${m}`,
        label: labels[m] ?? '',
        home: getWinner(r, homeParentIdx, prevMatches),
        away: getWinner(r, awayParentIdx, prevMatches),
      });
    }
    rounds.push({ name: roundNames[r], shortName: roundShorts[r], matches: nextMatches });
    prevMatches = nextMatches;
  }

  return rounds;
}

// ── Match card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  roundIdx,
  matchIdx,
  picks,
  onPick,
  isChampionship,
}: {
  match: BMatch;
  roundIdx: number;
  matchIdx: number;
  picks: Picks;
  onPick: (roundIdx: number, matchIdx: number, side: Side) => void;
  isChampionship?: boolean;
}) {
  const key = `${roundIdx}-${matchIdx}`;
  const picked = picks[key];

  const TeamRow = ({ team, side }: { team: BTeam | null; side: Side }) => {
    const isWinner = picked === side;
    const isLoser  = picked && picked !== side;
    const isTbd    = !team;

    return (
      <button
        onClick={() => team && onPick(roundIdx, matchIdx, side)}
        disabled={isTbd}
        className={[
          'flex w-full items-center gap-2 px-3 py-2 text-left transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50',
          isTbd
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]',
          isWinner
            ? 'bg-brand-teal/10 dark:bg-brand-teal/15'
            : '',
          isLoser
            ? 'opacity-30'
            : '',
        ].join(' ')}
      >
        {/* Flag */}
        {!isTbd && (
          <span className="text-lg leading-none shrink-0">{team.flag}</span>
        )}

        {/* Name */}
        <span className={[
          'flex-1 truncate text-[11px] font-semibold leading-tight',
          isTbd
            ? 'text-gray-300 dark:text-white/15 italic'
            : isWinner
              ? 'text-brand-teal dark:text-brand-teal font-bold'
              : 'text-gray-700 dark:text-white/80',
        ].join(' ')}>
          {isTbd ? '—' : team.name}
        </span>

        {/* Winner indicator */}
        {isWinner && (
          <svg className="h-3 w-3 text-brand-teal shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        )}
      </button>
    );
  };

  return (
    <div className={[
      'rounded-xl overflow-hidden border transition-all duration-200',
      isChampionship
        ? 'border-yellow-400/60 dark:border-yellow-400/40 shadow-lg shadow-yellow-400/10'
        : 'border-gray-200 dark:border-white/[0.07]',
      'bg-white dark:bg-white/[0.025]',
      isChampionship ? 'ring-1 ring-yellow-400/30' : '',
    ].join(' ')}>
      <div className="px-3 py-1 border-b border-gray-100 dark:border-white/[0.04]">
        <span className="text-[9px] font-bold tracking-widest uppercase text-gray-400 dark:text-white/25">
          {match.label}
        </span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/[0.04]">
        <TeamRow team={match.home} side="home" />
        <TeamRow team={match.away} side="away" />
      </div>
    </div>
  );
}

// ── Champion display ─────────────────────────────────────────────────────────
function ChampionBanner({ team }: { team: BTeam }) {
  return (
    <div className="mb-8 rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-400/10 via-yellow-300/5 to-transparent p-6 text-center">
      <div className="mb-2 text-4xl">{team.flag}</div>
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-yellow-500 dark:text-yellow-400 mb-1">
        Campeón del Mundo
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white">
        {team.name}
      </div>
    </div>
  );
}

// ── Connector line between rounds ────────────────────────────────────────────
function Connector() {
  return (
    <div className="flex items-center px-1 self-stretch">
      <div className="h-full w-px border-l border-dashed border-gray-200 dark:border-white/10" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BracketSimulator({ groups }: { groups: Group[] }) {
  const [picks, setPicks] = useState<Picks>({});

  const r32 = useMemo(() => buildR32(groups), [groups]);
  const bracket = useMemo(() => computeBracket(r32, picks), [r32, picks]);

  const champion = useMemo(() => {
    const finalRound = bracket[bracket.length - 1];
    const finalMatch = finalRound?.matches[0];
    if (!finalMatch) return null;
    const key = `${bracket.length - 1}-0`;
    const side = picks[key];
    if (!side) return null;
    return side === 'home' ? finalMatch.home : finalMatch.away;
  }, [bracket, picks]);

  const handlePick = (roundIdx: number, matchIdx: number, side: Side) => {
    setPicks(prev => {
      const next = { ...prev };
      const key = `${roundIdx}-${matchIdx}`;

      // If same pick → deselect
      if (prev[key] === side) {
        delete next[key];
        // Clear all downstream picks
        clearDownstream(next, roundIdx, matchIdx, bracket);
        return next;
      }

      // New pick — clear any prior downstream first
      clearDownstream(next, roundIdx, matchIdx, bracket);
      next[key] = side;
      return next;
    });
  };

  const handleReset = () => setPicks({});

  const filledCount = Object.keys(picks).length;
  const totalMatches = 16 + 8 + 4 + 2 + 1;

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">
            Simulador de Bracket
          </h2>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
            Toca un equipo para avanzarlo. {filledCount}/{totalMatches} partidos simulados.
          </p>
        </div>
        {filledCount > 0 && (
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/80 hover:border-gray-300 dark:hover:border-white/20 transition-colors"
          >
            Reiniciar
          </button>
        )}
      </div>

      {/* Champion banner */}
      {champion && <ChampionBanner team={champion} />}

      {/* Bracket — horizontal scroll */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-0 min-w-max">
          {bracket.map((round, rIdx) => {
            const isLast = rIdx === bracket.length - 1;
            const matchCount = round.matches.length;

            // Each match in round R needs 2^R vertical "slots" of space
            // We achieve this by spacing matches with flex gaps
            const gapClass = rIdx === 0 ? 'gap-2'
              : rIdx === 1 ? 'gap-8'
              : rIdx === 2 ? 'gap-20'
              : rIdx === 3 ? 'gap-44'
              : 'gap-0';

            const paddingClass = rIdx === 0 ? 'pt-0'
              : rIdx === 1 ? 'pt-[3.5rem]'
              : rIdx === 2 ? 'pt-[6.5rem]'
              : rIdx === 3 ? 'pt-[12.5rem]'
              : 'pt-[24.5rem]';

            return (
              <div key={round.name} className="flex">
                {/* Connector before each round except first */}
                {rIdx > 0 && (
                  <div className={['flex flex-col px-1.5', paddingClass, gapClass].join(' ')}>
                    {round.matches.map((_, mIdx) => (
                      <div key={mIdx} className="flex items-center h-[58px]">
                        <div className="w-3 h-px bg-gray-200 dark:bg-white/10" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Round column */}
                <div className="flex flex-col items-stretch" style={{ width: '152px' }}>
                  {/* Round label */}
                  <div className="mb-2 text-center">
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-gray-400 dark:text-white/30">
                      {round.shortName}
                    </span>
                  </div>

                  {/* Matches */}
                  <div className={['flex flex-col', gapClass, paddingClass].join(' ')}>
                    {round.matches.map((match, mIdx) => (
                      <MatchCard
                        key={match.id}
                        match={match}
                        roundIdx={rIdx}
                        matchIdx={mIdx}
                        picks={picks}
                        onPick={handlePick}
                        isChampionship={isLast}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector after last round */}
                {isLast && champion && (
                  <div className={['flex flex-col px-1.5', paddingClass].join(' ')}>
                    <div className="flex items-center h-[58px]">
                      <div className="w-3 h-px bg-yellow-400/40" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Champion trophy slot */}
          {champion && (
            <div className="flex flex-col justify-center items-center px-4" style={{ paddingTop: '24.5rem' }}>
              <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-center min-w-[100px]">
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-xs font-black text-yellow-500 dark:text-yellow-400 truncate max-w-[80px]">
                  {champion.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 text-[10px] text-gray-400 dark:text-white/30">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-brand-teal/40" />
          Seleccionado como ganador
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-gray-200 dark:bg-white/10" />
          Pendiente
        </span>
        <span>Toca el mismo equipo para deseleccionar</span>
      </div>
    </div>
  );
}

// ── Downstream pick clearing ─────────────────────────────────────────────────
function clearDownstream(
  picks: Picks,
  roundIdx: number,
  matchIdx: number,
  bracket: RoundData[],
): void {
  // The winner of (roundIdx, matchIdx) feeds into round roundIdx+1, match floor(matchIdx/2)
  // as either home (matchIdx even) or away (matchIdx odd)
  let curRound = roundIdx + 1;
  let curMatch = Math.floor(matchIdx / 2);

  while (curRound < bracket.length) {
    const key = `${curRound}-${curMatch}`;
    if (!picks[key]) break;
    delete picks[key];
    curMatch = Math.floor(curMatch / 2);
    curRound++;
  }
}
