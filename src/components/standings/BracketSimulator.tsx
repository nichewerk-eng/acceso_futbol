'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import type { Fixture } from './types';
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


// ── R32 bracket definition — verified from Fox Sports / ESPN live bracket ─────
// Adjacent pairs (0,1), (2,3), ... feed the same R16 match.
// LEFT half  [0-7]  → R16-A,B,C,D → 2 QFs → left SF  (Canada's side)
// RIGHT half [8-15] → R16-E,F,G,H → 2 QFs → right SF (Brazil/Mexico side)
// Canada (RSA/CAN, idx 2) and Brazil (BRA/JPN, idx 8) can only meet in the FINAL.
const R32_DEFS = [
  // LEFT — R16-A: GER/PAR winner vs FRA/SWE winner (Jul 4, 21:00 UTC)
  { id:'r01', date:'2026-06-29T20:30Z', label:'16vos · 29 Jun' }, // GER vs PAR
  { id:'r02', date:'2026-06-30T21:00Z', label:'16vos · 30 Jun' }, // FRA vs SWE
  // LEFT — R16-B: RSA/CAN winner vs NED/MAR winner (Jul 4, 17:00 UTC)
  { id:'r03', date:'2026-06-28T19:00Z', label:'16vos · 28 Jun' }, // RSA vs CAN
  { id:'r04', date:'2026-06-30T01:00Z', label:'16vos · 29 Jun' }, // NED vs MAR
  // LEFT — R16-C: POR/CRO winner vs ESP/AUT winner (Jul 6)
  { id:'r05', date:'2026-07-02T23:00Z', label:'16vos · 2 Jul'  }, // POR vs CRO
  { id:'r06', date:'2026-07-02T19:00Z', label:'16vos · 2 Jul'  }, // ESP vs AUT
  // LEFT — R16-D: USA/BIH winner vs BEL/SEN winner (Jul 6)
  { id:'r07', date:'2026-07-02T00:00Z', label:'16vos · 2 Jul'  }, // USA vs BIH
  { id:'r08', date:'2026-07-01T20:00Z', label:'16vos · 1 Jul'  }, // BEL vs SEN
  // RIGHT — R16-E: BRA/JPN winner vs CIV/NOR winner (Jul 5, 20:00 UTC)
  { id:'r09', date:'2026-06-29T17:00Z', label:'16vos · 29 Jun' }, // BRA vs JPN
  { id:'r10', date:'2026-06-30T17:00Z', label:'16vos · 30 Jun' }, // CIV vs NOR
  // RIGHT — R16-F: MEX/ECU winner vs ENG/COD winner (Jul 5-6)
  { id:'r11', date:'2026-07-01T01:00Z', label:'16vos · 30 Jun' }, // MEX vs ECU
  { id:'r12', date:'2026-07-01T16:00Z', label:'16vos · 1 Jul'  }, // ENG vs COD
  // RIGHT — R16-G: ARG/CPV winner vs AUS/EGY winner (Jul 7)
  { id:'r13', date:'2026-07-03T22:00Z', label:'16vos · 3 Jul'  }, // ARG vs CPV
  { id:'r14', date:'2026-07-03T18:00Z', label:'16vos · 3 Jul'  }, // AUS vs EGY
  // RIGHT — R16-H: SUI/ALG winner vs COL/GHA winner (Jul 7)
  { id:'r15', date:'2026-07-03T03:00Z', label:'16vos · 3 Jul'  }, // SUI vs ALG
  { id:'r16', date:'2026-07-04T01:30Z', label:'16vos · 4 Jul'  }, // COL vs GHA
];

// R16 pairings: R16-i = Winner(R32[2i]) vs Winner(R32[2i+1])
// Left half: R16-A(0) · R16-B(1) → QF-left-top; R16-C(2) · R16-D(3) → QF-left-bot
// Right half: R16-E(4) · R16-F(5) → QF-right-top; R16-G(6) · R16-H(7) → QF-right-bot
const R16_LABELS = ['Oct · 4 Jul','Oct · 4 Jul','Oct · 6 Jul','Oct · 6 Jul','Oct · 5 Jul','Oct · 5 Jul','Oct · 7 Jul','Oct · 7 Jul'];
const QF_LABELS  = ['Ctos · 9 Jul','Ctos · 10 Jul','Ctos · 11 Jul','Ctos · 12 Jul'];
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

// ── Build R32 from ESPN fixture data ─────────────────────────────────────────
// Each R32_DEF is matched to a real fixture by kickoff time (±3 h).
// Team names come directly from ESPN — no slot-based resolution needed
// now that the group stage is complete.
function buildR32(fixtures: Fixture[]): BMatch[] {
  return R32_DEFS.map(def => {
    const defMs = new Date(def.date).getTime();
    const fixture = fixtures.find(
      f => Math.abs(new Date(f.date).getTime() - defMs) < 3 * 60 * 60 * 1000
    );
    if (fixture?.home.name && fixture?.away.name) {
      return {
        id: def.id,
        label: def.label,
        home: { name: teamNameEs(fixture.home.name), abbr: fixture.home.abbreviation, flag: flag(fixture.home.abbreviation) },
        away: { name: teamNameEs(fixture.away.name), abbr: fixture.away.abbreviation, flag: flag(fixture.away.abbreviation) },
      };
    }
    return { id: def.id, label: def.label, home: null, away: null };
  });
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

interface LockedScore { home: string; away: string }

// ── Match card ───────────────────────────────────────────────────────────────
function MatchCard({
  match,
  roundIdx,
  matchIdx,
  picks,
  onPick,
  isChampionship,
  locked,
  lockedScore,
}: {
  match: BMatch;
  roundIdx: number;
  matchIdx: number;
  picks: Picks;
  onPick: (roundIdx: number, matchIdx: number, side: Side) => void;
  isChampionship?: boolean;
  locked?: boolean;
  lockedScore?: LockedScore;
}) {
  const key = `${roundIdx}-${matchIdx}`;
  const picked = picks[key];

  const TeamRow = ({ team, side }: { team: BTeam | null; side: Side }) => {
    const isWinner = picked === side;
    const isLoser  = picked && picked !== side;
    const isTbd    = !team;
    const score    = lockedScore ? (side === 'home' ? lockedScore.home : lockedScore.away) : null;

    return (
      <button
        onClick={() => !locked && team && onPick(roundIdx, matchIdx, side)}
        disabled={isTbd || locked}
        className={[
          'flex flex-1 w-full items-center gap-2 px-3 py-1 text-left transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/50',
          isTbd || locked
            ? 'cursor-default'
            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]',
          isWinner && locked
            ? 'bg-gray-100 dark:bg-white/[0.06]'
            : isWinner
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
            : isWinner && locked
              ? 'text-gray-700 dark:text-white/70 font-bold'
              : isWinner
                ? 'text-brand-teal dark:text-brand-teal font-bold'
                : 'text-gray-700 dark:text-white/80',
        ].join(' ')}>
          {isTbd ? '—' : team.name}
        </span>

        {/* Score (locked) or winner check (user pick) */}
        {isWinner && locked && score !== null && (
          <span className="text-[11px] font-bold tabular-nums text-gray-500 dark:text-white/50 shrink-0">
            {score}
          </span>
        )}
        {isWinner && !locked && (
          <svg className="h-3 w-3 text-brand-teal shrink-0" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        )}
      </button>
    );
  };

  return (
    <div
      style={{ height: CARD_H }}
      className={[
        'rounded-xl overflow-hidden border transition-all duration-200 flex flex-col',
        isChampionship
          ? 'border-yellow-400/60 dark:border-yellow-400/40 shadow-lg shadow-yellow-400/10'
          : locked
            ? 'border-gray-300/60 dark:border-white/[0.10]'
            : 'border-gray-200 dark:border-white/[0.07]',
        'bg-white dark:bg-white/[0.025]',
        isChampionship ? 'ring-1 ring-yellow-400/30' : '',
      ].join(' ')}
    >
      <div className="px-3 py-1 border-b border-gray-100 dark:border-white/[0.04] flex items-center justify-between">
        <span className="text-[9px] font-bold tracking-widest uppercase text-gray-400 dark:text-white/25">
          {match.label}
        </span>
        {locked && (
          <span className="text-[8px] font-bold tracking-wide uppercase text-gray-400 dark:text-white/25">
            Final
          </span>
        )}
      </div>
      <div className="flex-1 divide-y divide-gray-100 dark:divide-white/[0.04] flex flex-col">
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

// ── Bracket layout constants & helpers ───────────────────────────────────────
// CARD_H must match the actual rendered height of MatchCard.
// All y-positions in SVG connectors are derived from these two values.
const CARD_H  = 90;               // match card height (px)
const GAP_0   = 8;                // gap between cards in R32 (px)
const SLOT_0  = CARD_H + GAP_0;   // 98 — vertical slot occupied by one R32 card
const CONN_W  = 20;               // connector column width (px)
const LABEL_H = 20;               // round label row height (px)

/**
 * Returns the exact paddingTop and gap (both in px) for a given round index
 * so that each match is perfectly centred between its two parent matches.
 *
 * Derivation (H = CARD_H, G = GAP_0, S = SLOT_0 = H+G):
 *   paddingTop(r) = S * (2^(r-1) − 0.5)
 *   gap(r)        = (2^r − 1) * H + 2^r * G
 */
function bracketLayout(rIdx: number): { paddingTop: number; gap: number } {
  if (rIdx === 0) return { paddingTop: 0, gap: GAP_0 };
  const p2 = Math.pow(2, rIdx);
  return {
    paddingTop: SLOT_0 * (p2 / 2 - 0.5),
    gap:        (p2 - 1) * CARD_H + p2 * GAP_0,
  };
}

// ── Fixture → R32 slot matching ──────────────────────────────────────────────
function findR32Fixture(defDate: string, fixtures: Fixture[]): Fixture | undefined {
  const defMs = new Date(defDate).getTime();
  return fixtures.find(f => Math.abs(new Date(f.date).getTime() - defMs) < 3 * 60 * 60 * 1000);
}

// ── Main component ───────────────────────────────────────────────────────────
export default function BracketSimulator({ fixtures = [] }: { fixtures?: Fixture[] }) {
  const [picks, setPicks] = useState<Picks>({});
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [lockedScores, setLockedScores] = useState<Record<string, LockedScore>>({});

  // Auto-fill picks from completed R32 fixtures
  useEffect(() => {
    if (!fixtures.length) return;
    const newLocked = new Set<string>();
    const newScores: Record<string, LockedScore> = {};
    const newPicks: Picks = {};

    R32_DEFS.forEach((def, idx) => {
      const fixture = findR32Fixture(def.date, fixtures);
      if (!fixture || fixture.status.state !== 'post') return;
      const homeScore = Number(fixture.home.score ?? 0);
      const awayScore = Number(fixture.away.score ?? 0);
      // Skip if still 0-0 (data not yet populated)
      if (homeScore === 0 && awayScore === 0) return;
      const key = `0-${idx}`;
      // Use ESPN's winner flag — correctly reflects penalty shootout results
      // Fall back to score comparison only if winner flags are absent
      const homeWins = fixture.home.winner || (!fixture.away.winner && homeScore > awayScore);
      newPicks[key] = homeWins ? 'home' : 'away';
      newLocked.add(key);
      newScores[key] = { home: String(homeScore), away: String(awayScore) };
    });

    if (newLocked.size === 0) return;

    setPicks(prev => ({ ...prev, ...newPicks }));
    setLockedKeys(newLocked);
    setLockedScores(newScores);
  }, [fixtures]);

  const r32 = useMemo(() => buildR32(fixtures), [fixtures]);
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
    const key = `${roundIdx}-${matchIdx}`;
    if (lockedKeys.has(key)) return; // can't override real results
    setPicks(prev => {
      const next = { ...prev };

      // If same pick → deselect
      if (prev[key] === side) {
        delete next[key];
        clearDownstream(next, roundIdx, matchIdx, bracket);
        return next;
      }

      // New pick — clear any prior downstream first
      clearDownstream(next, roundIdx, matchIdx, bracket);
      next[key] = side;
      return next;
    });
  };

  // Reset only unlocked (user) picks
  const handleReset = () => {
    setPicks(prev => {
      const next: Picks = {};
      for (const k of lockedKeys) if (prev[k]) next[k] = prev[k];
      return next;
    });
  };

  const filledCount = Object.keys(picks).length;
  const lockedCount = lockedKeys.size;
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
            {lockedCount > 0
              ? `${lockedCount} resultado${lockedCount > 1 ? 's' : ''} oficial${lockedCount > 1 ? 'es' : ''} · ${filledCount - lockedCount}/${totalMatches - lockedCount} simulados`
              : `Toca un equipo para avanzarlo. ${filledCount}/${totalMatches} partidos simulados.`
            }
          </p>
        </div>
        {filledCount > lockedCount && (
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

      {/* ── Dual-sided bracket ──────────────────────────────────────────── */}
      {/* Layout: [R32L | R16L | QFL | SFL] ── [Final] ── [SFR | QFR | R16R | R32R] */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex min-w-max items-start">

          {/* ── LEFT HALF: R32 → R16 → QF → SF ──────────────────────────── */}
          {([0, 1, 2, 3] as const).map(rIdx => {
            const halfCount = bracket[rIdx].matches.length / 2;
            const matches   = bracket[rIdx].matches.slice(0, halfCount);
            const layout    = bracketLayout(rIdx);
            const prevLay   = rIdx > 0 ? bracketLayout(rIdx - 1) : null;
            const LLABELS   = ['16vos', 'Octavos', 'Cuartos', 'Semis'] as const;
            const mx        = CONN_W / 2;

            return (
              <Fragment key={`L${rIdx}`}>
                {/* Left-side connector: parent = left column, child = current */}
                {rIdx > 0 && prevLay && (
                  <div style={{ width: CONN_W, flexShrink: 0 }}>
                    <div style={{ height: LABEL_H }} />
                    <svg
                      width={CONN_W}
                      height={prevLay.paddingTop + (2 * halfCount - 1) * (CARD_H + prevLay.gap) + CARD_H}
                      className="text-gray-300 dark:text-white/[0.08] overflow-visible"
                    >
                      <g stroke="currentColor" strokeWidth="1" fill="none">
                        {Array.from({ length: halfCount }, (_, i) => {
                          const y0 = prevLay.paddingTop + (2*i)   * (CARD_H + prevLay.gap) + CARD_H/2;
                          const y1 = prevLay.paddingTop + (2*i+1) * (CARD_H + prevLay.gap) + CARD_H/2;
                          const yC = layout.paddingTop  + i       * (CARD_H + layout.gap)  + CARD_H/2;
                          return (
                            <g key={i}>
                              <line x1={0}      y1={y0} x2={mx}     y2={y0} />
                              <line x1={0}      y1={y1} x2={mx}     y2={y1} />
                              <line x1={mx}     y1={y0} x2={mx}     y2={y1} />
                              <line x1={mx}     y1={yC} x2={CONN_W} y2={yC} />
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                )}

                {/* Round column */}
                <div style={{ width: 152, flexShrink: 0 }}>
                  <div style={{ height: LABEL_H }} className="flex items-center justify-center">
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-gray-400 dark:text-white/30">
                      {LLABELS[rIdx]}
                    </span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: layout.paddingTop, gap: layout.gap }}>
                    {matches.map((match, relIdx) => {
                      const matchKey = `${rIdx}-${relIdx}`;
                      return (
                        <MatchCard
                          key={match.id}
                          match={match}
                          roundIdx={rIdx}
                          matchIdx={relIdx}
                          picks={picks}
                          onPick={handlePick}
                          locked={lockedKeys.has(matchKey)}
                          lockedScore={lockedScores[matchKey]}
                        />
                      );
                    })}
                  </div>
                </div>
              </Fragment>
            );
          })}

          {/* ── CENTER: Final ─────────────────────────────────────────────── */}
          {(() => {
            const sfLay   = bracketLayout(3);          // SF has 1 match per side
            const sfY     = sfLay.paddingTop + CARD_H / 2;
            const svgH    = sfLay.paddingTop + CARD_H;
            const finalMatch = bracket[4]?.matches[0];
            const finalKey   = '4-0';
            return (
              <Fragment key="final">
                {/* Entry line from left SF */}
                <div style={{ width: CONN_W, flexShrink: 0 }}>
                  <div style={{ height: LABEL_H }} />
                  <svg width={CONN_W} height={svgH} className="text-gray-300 dark:text-white/[0.08] overflow-visible">
                    <line x1={0} y1={sfY} x2={CONN_W} y2={sfY} stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>

                {/* Final column */}
                <div style={{ width: 152, flexShrink: 0 }}>
                  <div style={{ height: LABEL_H }} className="flex items-center justify-center">
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-yellow-500 dark:text-yellow-400">
                      Final · 19 Jul
                    </span>
                  </div>
                  <div style={{ paddingTop: sfLay.paddingTop }}>
                    {finalMatch && (
                      <MatchCard
                        match={finalMatch}
                        roundIdx={4}
                        matchIdx={0}
                        picks={picks}
                        onPick={handlePick}
                        isChampionship
                        locked={lockedKeys.has(finalKey)}
                        lockedScore={lockedScores[finalKey]}
                      />
                    )}
                  </div>
                </div>

                {/* Exit line to right SF */}
                <div style={{ width: CONN_W, flexShrink: 0 }}>
                  <div style={{ height: LABEL_H }} />
                  <svg width={CONN_W} height={svgH} className="text-gray-300 dark:text-white/[0.08] overflow-visible">
                    <line x1={0} y1={sfY} x2={CONN_W} y2={sfY} stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>
              </Fragment>
            );
          })()}

          {/* ── RIGHT HALF: SF → QF → R16 → R32 (mirror) ─────────────────── */}
          {[3, 2, 1, 0].map((rIdx, displayIdx) => {
            const halfCount  = bracket[rIdx].matches.length / 2;
            const absStart   = halfCount;
            const matches    = bracket[rIdx].matches.slice(absStart);
            const layout     = bracketLayout(rIdx);
            const RLABELS    = ['Semis', 'Cuartos', 'Octavos', '16vos'];
            const mx         = CONN_W / 2;

            // outer round = one step further from center (more matches, to the right)
            const outerRIdx  = displayIdx < 3 ? [3, 2, 1, 0][displayIdx + 1] : -1;
            const outerLay   = outerRIdx >= 0 ? bracketLayout(outerRIdx) : null;

            return (
              <Fragment key={`R${rIdx}`}>
                {/* Round column */}
                <div style={{ width: 152, flexShrink: 0 }}>
                  <div style={{ height: LABEL_H }} className="flex items-center justify-center">
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-gray-400 dark:text-white/30">
                      {RLABELS[displayIdx]}
                    </span>
                  </div>
                  <div className="flex flex-col" style={{ paddingTop: layout.paddingTop, gap: layout.gap }}>
                    {matches.map((match, relIdx) => {
                      const absIdx   = absStart + relIdx;
                      const matchKey = `${rIdx}-${absIdx}`;
                      return (
                        <MatchCard
                          key={match.id}
                          match={match}
                          roundIdx={rIdx}
                          matchIdx={absIdx}
                          picks={picks}
                          onPick={handlePick}
                          locked={lockedKeys.has(matchKey)}
                          lockedScore={lockedScores[matchKey]}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Right-side connector: parent = outer (right), child = current (left) */}
                {outerLay && (
                  <div style={{ width: CONN_W, flexShrink: 0 }}>
                    <div style={{ height: LABEL_H }} />
                    <svg
                      width={CONN_W}
                      height={outerLay.paddingTop + (2 * halfCount - 1) * (CARD_H + outerLay.gap) + CARD_H}
                      className="text-gray-300 dark:text-white/[0.08] overflow-visible"
                    >
                      <g stroke="currentColor" strokeWidth="1" fill="none">
                        {Array.from({ length: halfCount }, (_, i) => {
                          const y0 = outerLay.paddingTop + (2*i)   * (CARD_H + outerLay.gap) + CARD_H/2;
                          const y1 = outerLay.paddingTop + (2*i+1) * (CARD_H + outerLay.gap) + CARD_H/2;
                          const yC = layout.paddingTop   + i       * (CARD_H + layout.gap)   + CARD_H/2;
                          return (
                            <g key={i}>
                              <line x1={CONN_W} y1={y0} x2={mx}     y2={y0} />
                              <line x1={CONN_W} y1={y1} x2={mx}     y2={y1} />
                              <line x1={mx}     y1={y0} x2={mx}     y2={y1} />
                              <line x1={mx}     y1={yC} x2={0}      y2={yC} />
                            </g>
                          );
                        })}
                      </g>
                    </svg>
                  </div>
                )}
              </Fragment>
            );
          })}

        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 text-[10px] text-gray-400 dark:text-white/30">
        {lockedCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-sm bg-gray-300 dark:bg-white/20" />
            Resultado oficial (no editable)
          </span>
        )}
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
