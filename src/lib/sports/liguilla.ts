import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import { isFixtureHeld } from './localizeEs';
import { scheduleAbbr } from './ligaMxAbbr';
import type { Fixture, TeamRef } from './types';

/**
 * Liga MX Apertura 2026 Liguilla (FMF reglamento, arts. 27–33):
 * - Top 8 of the Tabla General, no Play-In. Cuartos 1v8 · 2v7 · 3v6 · 4v5.
 * - Ida at the lower seed, vuelta at the higher seed. Global over 180'.
 * - Cuartos / Semis: global tie → better table position advances. No ET, no penalties.
 * - Semis and Final reseed survivors by table position (1v4, 2v3; then 1v2).
 * - Final: global tie → 2×15' extra time, then penalties.
 */

export type LiguillaRound = 'cuartos' | 'semis' | 'final';

export const LIGUILLA_ROUNDS: LiguillaRound[] = ['cuartos', 'semis', 'final'];
export const REGULAR_SEASON_ROUNDS = 17;

/** Liguilla rounds continue the jornada numbering so every jornada-keyed surface orders them. */
const ROUND_NUMBER: Record<LiguillaRound, number> = { cuartos: 18, semis: 19, final: 20 };

const ROUND_LABEL: Record<LiguillaRound, string> = {
  cuartos: 'Cuartos de final',
  semis: 'Semifinales',
  final: 'Final',
};

const ROUND_SHORT: Record<LiguillaRound, string> = {
  cuartos: 'Cuartos',
  semis: 'Semis',
  final: 'Final',
};

export const LIGUILLA_ROUND_NUMBERS = LIGUILLA_ROUNDS.map((r) => ROUND_NUMBER[r]);

export type LiguillaSeed = { seed: number; abbr: string; name: string; pts: number };

/** Tabla General final, Jornada 17 (closed 23 nov 2026). */
export const APERTURA_2026_SEEDS: LiguillaSeed[] = [
  { seed: 1, abbr: 'GDL', name: 'Guadalajara', pts: 33 },
  { seed: 2, abbr: 'CAZ', name: 'Cruz Azul', pts: 32 },
  { seed: 3, abbr: 'AME', name: 'América', pts: 30 },
  { seed: 4, abbr: 'ATS', name: 'Atlas', pts: 28 },
  { seed: 5, abbr: 'TOL', name: 'Toluca', pts: 27 },
  { seed: 6, abbr: 'MTY', name: 'Monterrey', pts: 27 },
  { seed: 7, abbr: 'LEO', name: 'León', pts: 26 },
  { seed: 8, abbr: 'PAC', name: 'Pachuca', pts: 25 },
];

/** Sportmonks stage ids for season 28009 (the Final stage is published later). */
const APERTURA_2026_STAGE_IDS: Record<number, LiguillaRound> = {
  77485004: 'cuartos',
  77485005: 'semis',
};

/** Mexico-City day windows, for feeds that carry `leg` but no stage (livescores). */
const APERTURA_2026_WINDOWS: { round: LiguillaRound; from: string; to: string }[] = [
  { round: 'cuartos', from: '2026-11-24', to: '2026-11-30' },
  { round: 'semis', from: '2026-12-01', to: '2026-12-07' },
  { round: 'final', from: '2026-12-08', to: '2026-12-31' },
];

/** Round for a Sportmonks Liga MX fixture with no regular-season `round`. */
export function liguillaRoundFromSportmonks(f: {
  stageName?: string | null;
  stageId?: number | null;
  leg?: string | null;
  date: string;
}): LiguillaRound | null {
  const byName = liguillaRoundFromText(f.stageName);
  if (byName) return byName;
  if (f.stageId != null && APERTURA_2026_STAGE_IDS[f.stageId]) {
    return APERTURA_2026_STAGE_IDS[f.stageId]!;
  }
  if (!f.leg) return null;
  return liguillaRoundFromDay(mexicoDayKey(new Date(f.date)));
}

/** Liguilla round whose window holds this Mexico-City day ("2026-11-25"). */
export function liguillaRoundFromDay(day: string | null | undefined): LiguillaRound | null {
  if (!day) return null;
  return APERTURA_2026_WINDOWS.find((w) => day >= w.from && day <= w.to)?.round ?? null;
}

/** Sportmonks `leg: "1/2"` → 1. */
export function legFromSportmonks(raw: string | null | undefined): 1 | 2 | undefined {
  const n = Number(String(raw ?? '').split('/')[0]);
  return n === 1 || n === 2 ? n : undefined;
}

export function liguillaRoundFromText(raw: string | null | undefined): LiguillaRound | null {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s || /jornada/.test(s)) return null;
  if (/quarter|cuarto|4tos|^(qf|cf)\b/.test(s)) return 'cuartos';
  if (/semi|^sf\b/.test(s)) return 'semis';
  if (/\bfinal\b/.test(s)) return 'final';
  return null;
}

export function liguillaRoundNumber(round: LiguillaRound): number {
  return ROUND_NUMBER[round];
}

export function liguillaRoundFromNumber(n: number | null | undefined): LiguillaRound | null {
  return LIGUILLA_ROUNDS.find((r) => ROUND_NUMBER[r] === n) ?? null;
}

export function liguillaRoundLabel(round: LiguillaRound): string {
  return ROUND_LABEL[round];
}

export function isLiguillaNumber(n: number | null | undefined): boolean {
  return liguillaRoundFromNumber(n) != null;
}

/** "Jornada 7" → 7, "Cuartos de final" → 18, "Final" → 20. */
export function roundNumberFromLabel(label: string | null | undefined): number | null {
  const round = liguillaRoundFromText(label);
  if (round) return ROUND_NUMBER[round];
  const m = String(label ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/** Display label for a round number: "Jornada 7" or "Cuartos de final". */
export function roundLabel(n: number | null | undefined): string {
  const round = liguillaRoundFromNumber(n);
  if (round) return ROUND_LABEL[round];
  return n ? `Jornada ${n}` : 'Jornada';
}

/** Chip label: "J7" or "Cuartos". */
export function roundShort(n: number | null | undefined): string {
  const round = liguillaRoundFromNumber(n);
  if (round) return ROUND_SHORT[round];
  return n ? `J${n}` : 'J';
}

export function legLabel(leg: 1 | 2 | null | undefined): string | null {
  if (leg === 1) return 'Ida';
  if (leg === 2) return 'Vuelta';
  return null;
}

/** "Cuartos · Ida" for a Liguilla fixture, null otherwise. */
export function liguillaFixtureTag(f: Pick<Fixture, 'jornada' | 'leg'>): string | null {
  const round = liguillaRoundFromText(f.jornada);
  if (!round) return null;
  const leg = legLabel(f.leg);
  return leg ? `${ROUND_SHORT[round]} · ${leg}` : ROUND_SHORT[round];
}

export function isLiguillaFixture(f: Pick<Fixture, 'league' | 'jornada'>): boolean {
  return f.league === 'liga-mx' && liguillaRoundFromText(f.jornada) != null;
}

/** "2nd ranked" / "Winner QF1" → seed rank among survivors, when Sportmonks gives one. */
export function placeholderRank(name: string | null | undefined): number | null {
  const m = String(name ?? '').match(/(\d+)\s*(?:st|nd|rd|th|º|°)?\s*ranked/i);
  return m ? Number(m[1]) : null;
}

export function placeholderLabel(rank: number | null | undefined): string {
  if (rank === 1) return 'Mejor sembrado';
  if (rank) return `${rank}º mejor sembrado`;
  return 'Por definir';
}

// ─── Series ────────────────────────────────────────────────────────────────

export type LiguillaSide = {
  abbr: string | null;
  name: string;
  seed: number | null;
};

export type LiguillaSeriesStatus = 'tbd' | 'pre' | 'live' | 'between' | 'post';

export type LiguillaSeries = {
  key: string;
  round: LiguillaRound;
  /** Better seed: hosts the vuelta and wins a tied global (not in the Final). */
  high: LiguillaSide;
  low: LiguillaSide;
  ida: Fixture | null;
  vuelta: Fixture | null;
  /** Goals over both legs, in-play included. Null until a ball is kicked. */
  aggregate: { high: number; low: number } | null;
  status: LiguillaSeriesStatus;
  /** Who goes through if it ended now (tiebreak applied). */
  leader: 'high' | 'low' | null;
  winner: 'high' | 'low' | null;
  verdict: string;
  /** Set when the series was settled by table position or penalties. */
  decidedBy: 'global' | 'posicion' | 'penales' | null;
};

export type LiguillaRoundBoard = {
  round: LiguillaRound;
  number: number;
  label: string;
  series: LiguillaSeries[];
  fixtures: Fixture[];
  from: string | null;
  to: string | null;
  state: 'pending' | 'active' | 'done';
};

export type LiguillaBoard = {
  season: string;
  generatedAt: string;
  seeds: LiguillaSeed[];
  rounds: LiguillaRoundBoard[];
  /** Round in focus: first one not sealed. */
  current: LiguillaRound;
  champion: LiguillaSide | null;
  /** Liguilla games today (Mexico City day) or in play. */
  today: Fixture[];
  /** Next slate when nothing is on today. */
  next: Fixture[];
  nextDayKey: string | null;
  todayKey: string;
};

type Slot = { high: LiguillaSide; low: LiguillaSide; ranks?: [number, number] };

function goals(score: string | null | undefined): number {
  const n = Number(score);
  return Number.isFinite(n) ? n : 0;
}

function abbrOf(t: TeamRef): string | null {
  if (t.placeholder) return null;
  const a = scheduleAbbr(t.abbreviation || '');
  return a && a !== 'TBD' ? a : null;
}

function seedSide(seeds: LiguillaSeed[], abbr: string): LiguillaSide {
  const s = seeds.find((x) => x.abbr === abbr);
  return { abbr, name: s?.name ?? abbr, seed: s?.seed ?? null };
}

function tbdSide(rank: number | null): LiguillaSide {
  return { abbr: null, name: placeholderLabel(rank), seed: null };
}

function fixtureMatchesSlot(f: Fixture, slot: Slot): boolean {
  const h = abbrOf(f.home);
  const a = abbrOf(f.away);
  if (slot.high.abbr && slot.low.abbr && h && a) {
    const want = [slot.high.abbr, slot.low.abbr].sort().join('|');
    return [h, a].sort().join('|') === want;
  }
  if (slot.ranks) {
    const got = [f.home.placeholderRank, f.away.placeholderRank];
    if (got.every((r) => typeof r === 'number')) {
      return [...got].sort().join('|') === [...slot.ranks].sort().join('|');
    }
  }
  return false;
}

function orderLegs(legs: Fixture[], slot: Slot): { ida: Fixture | null; vuelta: Fixture | null } {
  const sorted = [...legs].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const ida =
    sorted.find((f) => f.leg === 1) ??
    sorted.find((f) => slot.low.abbr && abbrOf(f.home) === slot.low.abbr) ??
    sorted[0] ??
    null;
  const vuelta = sorted.find((f) => f !== ida && (f.leg === 2 || f.leg == null)) ?? null;
  return { ida, vuelta };
}

function goalsFor(f: Fixture, abbr: string): number {
  if (abbrOf(f.home) === abbr) return goals(f.home.score);
  if (abbrOf(f.away) === abbr) return goals(f.away.score);
  return 0;
}

function penaltyWinner(f: Fixture, high: LiguillaSide): 'high' | 'low' | null {
  const highIsHome = abbrOf(f.home) === high.abbr;
  if (f.penalties && f.penalties.home !== f.penalties.away) {
    const homeWon = f.penalties.home > f.penalties.away;
    return homeWon === highIsHome ? 'high' : 'low';
  }
  if (f.winnerSide) return (f.winnerSide === 'home') === highIsHome ? 'high' : 'low';
  return null;
}

function buildSeries(round: LiguillaRound, index: number, slot: Slot, pool: Fixture[]): LiguillaSeries {
  const { high, low } = slot;
  const legs = pool.filter((f) => fixtureMatchesSlot(f, slot));
  const { ida, vuelta } = orderLegs(legs, slot);
  const key = `${round}-${index + 1}`;
  const known = Boolean(high.abbr && low.abbr);
  const final = round === 'final';

  const base: LiguillaSeries = {
    key,
    round,
    high,
    low,
    ida,
    vuelta,
    aggregate: null,
    status: 'tbd',
    leader: null,
    winner: null,
    verdict: round === 'semis' ? 'Se define en cuartos' : 'Se define en semifinales',
    decidedBy: null,
  };
  if (!known) return base;

  const kicked = [ida, vuelta].filter(
    (f): f is Fixture => Boolean(f && (f.state === 'in' || f.state === 'post'))
  );
  const aggregate = kicked.length
    ? {
        high: kicked.reduce((n, f) => n + goalsFor(f, high.abbr!), 0),
        low: kicked.reduce((n, f) => n + goalsFor(f, low.abbr!), 0),
      }
    : null;
  const live = kicked.some((f) => f.state === 'in');
  const done = vuelta?.state === 'post';
  const diff = aggregate ? aggregate.high - aggregate.low : 0;
  const tiePass = `avanza ${high.abbr} por posición`;
  const globalLine = aggregate ? `Global ${high.abbr} ${aggregate.high}–${aggregate.low} ${low.abbr}` : '';

  if (done && aggregate) {
    let winner: 'high' | 'low' | null = diff > 0 ? 'high' : diff < 0 ? 'low' : null;
    let decidedBy: LiguillaSeries['decidedBy'] = winner ? 'global' : null;
    if (!winner && !final) {
      winner = 'high';
      decidedBy = 'posicion';
    } else if (!winner && final && vuelta) {
      winner = penaltyWinner(vuelta, high);
      decidedBy = winner ? 'penales' : null;
    }
    const w = winner === 'high' ? high : winner === 'low' ? low : null;
    const pens =
      decidedBy === 'penales' && vuelta?.penalties
        ? ` · penales ${vuelta.penalties.home}–${vuelta.penalties.away}`
        : '';
    const verdict = w
      ? final
        ? `${w.name} campeón · ${globalLine}${pens}`
        : `${w.abbr} a ${round === 'cuartos' ? 'semifinales' : 'la final'} · ${globalLine}${
            decidedBy === 'posicion' ? ' (mejor posición)' : ''
          }`
      : globalLine;
    return { ...base, aggregate, status: 'post', leader: winner, winner, verdict, decidedBy };
  }

  if (!aggregate) {
    return {
      ...base,
      status: 'pre',
      verdict: final
        ? 'Si empatan en el global: tiempo extra y penales'
        : `Si empatan en el global, ${tiePass} (${high.seed}º)`,
    };
  }

  const leader: 'high' | 'low' | null =
    diff > 0 ? 'high' : diff < 0 ? 'low' : final ? null : 'high';
  const now =
    diff !== 0
      ? `${(diff > 0 ? high : low).abbr} ${live ? 'avanza hoy' : 'lleva ventaja'}`
      : final
        ? 'empate: iría a tiempo extra'
        : `empate: ${tiePass}`;
  return {
    ...base,
    aggregate,
    status: live ? 'live' : 'between',
    leader,
    verdict: `${globalLine} · ${now}`,
  };
}

function survivors(series: LiguillaSeries[], seeds: LiguillaSeed[]): LiguillaSide[] | null {
  const winners = series.map((s) => (s.winner === 'high' ? s.high : s.winner === 'low' ? s.low : null));
  if (winners.some((w) => !w?.abbr)) return null;
  return (winners as LiguillaSide[])
    .map((w) => seedSide(seeds, w.abbr!))
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
}

function rankSlots(ranks: [number, number][], alive: LiguillaSide[] | null): Slot[] {
  return ranks.map(([hi, lo]) => ({
    high: alive?.[hi - 1] ?? tbdSide(hi),
    low: alive?.[lo - 1] ?? tbdSide(lo),
    ranks: [hi, lo],
  }));
}

function inRound(fixtures: Fixture[], round: LiguillaRound): Fixture[] {
  return fixtures
    .filter((f) => liguillaRoundFromText(f.jornada) === round)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

function swapPlaceholder(t: TeamRef, alive: LiguillaSide[] | null): TeamRef {
  if (!t.placeholder || !alive || !t.placeholderRank) return t;
  const side = alive[t.placeholderRank - 1];
  if (!side?.abbr) return t;
  return { id: side.abbr, name: side.name, abbreviation: side.abbr, score: t.score };
}

function fillRound(fixtures: Fixture[], round: LiguillaRound, alive: LiguillaSide[] | null): Fixture[] {
  if (!alive) return fixtures;
  return fixtures.map((f) =>
    liguillaRoundFromText(f.jornada) === round && (f.home.placeholder || f.away.placeholder)
      ? { ...f, home: swapPlaceholder(f.home, alive), away: swapPlaceholder(f.away, alive) }
      : f
  );
}

function roundWindow(fixtures: Fixture[]): { from: string | null; to: string | null } {
  return { from: fixtures[0]?.date ?? null, to: fixtures[fixtures.length - 1]?.date ?? null };
}

function roundState(series: LiguillaSeries[]): LiguillaRoundBoard['state'] {
  if (series.every((s) => s.status === 'post')) return 'done';
  if (series.some((s) => s.status !== 'tbd' && s.status !== 'pre')) return 'active';
  return 'pending';
}

function seriesBoard(fixtures: Fixture[], seeds: LiguillaSeed[]) {
  const qfSlots: Slot[] = [0, 1, 2, 3].map((i) => ({
    high: seedSide(seeds, seeds[i]!.abbr),
    low: seedSide(seeds, seeds[seeds.length - 1 - i]!.abbr),
  }));
  let pool = fixtures;
  const cuartos = qfSlots.map((s, i) => buildSeries('cuartos', i, s, inRound(pool, 'cuartos')));

  const sfAlive = survivors(cuartos, seeds);
  pool = fillRound(pool, 'semis', sfAlive);
  const semis = rankSlots(
    [
      [1, 4],
      [2, 3],
    ],
    sfAlive
  ).map((s, i) => buildSeries('semis', i, s, inRound(pool, 'semis')));

  const finalAlive = survivors(semis, seeds);
  pool = fillRound(pool, 'final', finalAlive);
  const final = rankSlots([[1, 2]], finalAlive).map((s, i) =>
    buildSeries('final', i, s, inRound(pool, 'final'))
  );

  return { pool, byRound: { cuartos, semis, final } as Record<LiguillaRound, LiguillaSeries[]> };
}

/**
 * Swap Sportmonks placeholder sides ("2nd ranked") for the real club once the
 * previous round is sealed, so every surface shows Chivas–Atlas the moment
 * cuartos end instead of waiting for the provider to re-publish the fixture.
 */
export function resolveLiguillaPlaceholders(
  fixtures: Fixture[],
  seeds: LiguillaSeed[] = APERTURA_2026_SEEDS
): Fixture[] {
  if (!fixtures.some((f) => f.home.placeholder || f.away.placeholder)) return fixtures;
  const liguilla = fixtures.filter(isLiguillaFixture);
  const { pool } = seriesBoard(liguilla, seeds);
  const byId = new Map(pool.map((f) => [f.id, f]));
  return fixtures.map((f) => byId.get(f.id) ?? f);
}

function slateOf(fixtures: Fixture[], now: Date) {
  const todayKey = mexicoDayKey(now);
  const open = fixtures.filter((f) => !isFixtureHeld(f.statusLabel));
  const today = open.filter((f) => f.state === 'in' || isMexicoDay(f.date, todayKey));
  if (today.length) return { todayKey, today, next: [] as Fixture[], nextDayKey: null };
  const future = open
    .filter((f) => f.state === 'pre' && +new Date(f.date) > +now)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const nextDayKey = future[0] ? mexicoDayKey(new Date(future[0].date)) : null;
  return {
    todayKey,
    today,
    next: nextDayKey ? future.filter((f) => isMexicoDay(f.date, nextDayKey)) : [],
    nextDayKey,
  };
}

/** Full Liguilla state from the one Liga MX board (any fixtures; non-Liguilla rows are ignored). */
export function buildLiguillaBoard(
  fixtures: Fixture[],
  now = new Date(),
  seeds: LiguillaSeed[] = APERTURA_2026_SEEDS
): LiguillaBoard {
  const { pool, byRound } = seriesBoard(fixtures.filter(isLiguillaFixture), seeds);
  const rounds: LiguillaRoundBoard[] = LIGUILLA_ROUNDS.map((round) => {
    const list = inRound(pool, round);
    return {
      round,
      number: ROUND_NUMBER[round],
      label: ROUND_LABEL[round],
      series: byRound[round],
      fixtures: list,
      ...roundWindow(list),
      state: roundState(byRound[round]),
    };
  });
  const current = rounds.find((r) => r.state !== 'done')?.round ?? 'final';
  const finalSeries = byRound.final[0];
  const champion =
    finalSeries?.winner === 'high'
      ? finalSeries.high
      : finalSeries?.winner === 'low'
        ? finalSeries.low
        : null;

  return {
    season: 'Apertura 2026',
    generatedAt: now.toISOString(),
    seeds,
    rounds,
    current,
    champion,
    ...slateOf(pool, now),
  };
}

export function seriesForFixture(board: LiguillaBoard, fixtureId: string): LiguillaSeries | null {
  for (const r of board.rounds) {
    for (const s of r.series) {
      if (s.ida?.id === fixtureId || s.vuelta?.id === fixtureId) return s;
    }
  }
  return null;
}

export function liguillaFixtures(board: LiguillaBoard): Fixture[] {
  return board.rounds.flatMap((r) => r.fixtures);
}
