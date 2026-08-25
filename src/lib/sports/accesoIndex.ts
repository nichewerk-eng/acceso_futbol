import type { LineupPos } from '@/lib/sports/types';

/** Weight on team performance. Player SM rating keeps 1 - λ. */
export const ACCESO_LAMBDA = 0.35;
export const ACCESO_BASELINE = 6.5;
export const ACCESO_MIN = 3;
export const ACCESO_MAX = 10;
export const ACCESO_MAX_PER_CLUB = 3;
export const ACCESO_EARLY_JORNADA = 3;

export const ACCESO_FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2'] as const;
export type AccesoFormation = (typeof ACCESO_FORMATIONS)[number];

export type AccesoBand = Extract<LineupPos, 'GK' | 'DEF' | 'MID' | 'FWD'>;

export function clipAcceso(n: number): number {
  if (!Number.isFinite(n)) return ACCESO_BASELINE;
  return Math.min(ACCESO_MAX, Math.max(ACCESO_MIN, n));
}

export function wdlFromGd(gd: number): -1 | 0 | 1 {
  if (gd > 0) return 1;
  if (gd < 0) return -1;
  return 0;
}

/** PPG → opponent strength in [0.30, 0.70] via league mean/sd. */
export function ppgToOpp(ppg: number, mean: number, sd: number): number {
  if (!(sd > 1e-6)) return 0.5;
  const z = (ppg - mean) / sd;
  return Math.min(0.7, Math.max(0.3, 0.5 + 0.1 * z));
}

export function leaguePpgStats(ppgs: number[]): { mean: number; sd: number } {
  const n = ppgs.length;
  if (n === 0) return { mean: 1, sd: 0 };
  const mean = ppgs.reduce((a, b) => a + b, 0) / n;
  const variance = ppgs.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, sd: Math.sqrt(variance) };
}

/** J1–J3 tabla is noise: mix observed Opp toward 0.5. */
export function shrinkOpp(opp: number, jornada: number): number {
  if (jornada > ACCESO_EARLY_JORNADA) return opp;
  return 0.7 * 0.5 + 0.3 * opp;
}

/**
 * Team performance on the same 3–10 scale as SM ratings.
 * T = 6.5 + WDL + 0.6 tanh(GD/1.5) + 0.4 (Opp-0.5) sign(WDL)
 */
export function teamPerformanceScore(gd: number, opp: number): number {
  const wdl = wdlFromGd(gd);
  const gdTerm = Math.tanh(gd / 1.5);
  const oppTerm = (opp - 0.5) * wdl;
  return clipAcceso(ACCESO_BASELINE + wdl + 0.6 * gdTerm + 0.4 * oppTerm);
}

/** A = (1-λ) r + λ T */
export function accesoIndex(r: number, teamScore: number, lambda = ACCESO_LAMBDA): number {
  return clipAcceso((1 - lambda) * r + lambda * teamScore);
}

/** Liga MX Apertura has 18 clubs; gaps on the tabla sit in [0, 1]. */
export const ACCESO_TABLA_SPAN = 17;

/** World Football Elo home bump (eloratings.net). Liga MX home edge is real. */
export const ACCESO_HFA_ELO = 100;
export const ACCESO_ELO_DIVISOR = 400;
/** Mild pos→Elo so J5 tabla noise (2° vs 12°) is not a 400-point canyon. */
export const ACCESO_POS_ELO_K = 16;
export const ACCESO_OPP_ELO_K = 1800;
export const ACCESO_RATING_OPP_MIX = 0.62;

export const ACCESO_OMEGA_BASE = 6.4;
export const ACCESO_OMEGA_RESIDUAL = 1.05;
export const ACCESO_OMEGA_ATTACK = 0.94;
export const ACCESO_OMEGA_DEFENSE = 0.18;
export const ACCESO_DEFENSE_TAU = 2.3;
export const ACCESO_ATTACK_OPP_FLOOR = 0.7;
export const ACCESO_ATTACK_OPP_GAIN = 0.6;

export type JornadaTeamInput = {
  home: boolean;
  gf: number;
  ga: number;
  /** Opponent strength in [0.30, 0.70] from PPG. */
  opp: number;
  /** 1 = first. Null if the tabla is missing. */
  pos: number | null;
  oppPos: number | null;
};

export type JornadaTeamParts = {
  expected: number;
  margin: number;
  result: number;
  residual: number;
  attack: number;
  defense: number;
  omega: number;
};

export function eloFromPos(pos: number | null): number {
  if (pos == null || !Number.isFinite(pos)) return 1500;
  return 1500 + ACCESO_POS_ELO_K * (9.5 - pos);
}

export function eloFromOpp(opp: number): number {
  const x = Number.isFinite(opp) ? opp : 0.5;
  return 1500 + ACCESO_OPP_ELO_K * (x - 0.5);
}

function rivalRating(opp: number, oppPos: number | null): number {
  const fromOpp = eloFromOpp(opp);
  if (oppPos == null) return fromOpp;
  return ACCESO_RATING_OPP_MIX * fromOpp + (1 - ACCESO_RATING_OPP_MIX) * eloFromPos(oppPos);
}

/**
 * Win expectancy in [0, 1] (draw = 0.5), Elo logistic + home advantage.
 * We = 1 / (1 + 10^(-Δ/400)), Δ = R_us - R_them ± HFA.
 */
export function expectedMatchScore(input: JornadaTeamInput): number {
  const us = eloFromPos(input.pos);
  const them = rivalRating(input.opp, input.oppPos);
  const delta = us - them + (input.home ? ACCESO_HFA_ELO : -ACCESO_HFA_ELO);
  return 1 / (1 + 10 ** (-delta / ACCESO_ELO_DIVISOR));
}

/** World Football Elo / ClubElo-family margin G. */
export function marginG(gd: number): number {
  const n = Math.abs(gd);
  if (n <= 1) return 1;
  if (n === 2) return 1.5;
  return (11 + n) / 8;
}

function matchS(gd: number): number {
  if (gd > 0) return 1;
  if (gd < 0) return 0;
  return 0.5;
}

/**
 * Acceso Ω — one-match team value on the 3–10 kit.
 *
 * Industry core (ClubElo / World Football Elo / SPI):
 *   residual = G × (S − We)  → how surprising the result was, scaled by margin
 * Then SPI-style split, without extra xG calls:
 *   attack  = ln(1+GF) × (0.70 + 0.60·Opp)   goals vs a real opponent, slow saturate
 *   defense = e^(−GA / 2.3)                   soft sheet, not a 0.22 lump
 *
 * Ω = 6.4 + 1.05·residual + 0.94·attack + 0.18·defense
 */
export function jornadaTeamParts(input: JornadaTeamInput): JornadaTeamParts {
  const gd = input.gf - input.ga;
  const expected = expectedMatchScore(input);
  const margin = marginG(gd);
  const result = matchS(gd);
  const residual = margin * (result - expected);
  const attack =
    Math.log1p(Math.max(0, input.gf)) *
    (ACCESO_ATTACK_OPP_FLOOR + ACCESO_ATTACK_OPP_GAIN * input.opp);
  const defense = Math.exp(-Math.max(0, input.ga) / ACCESO_DEFENSE_TAU);
  const omega = clipAcceso(
    ACCESO_OMEGA_BASE +
      ACCESO_OMEGA_RESIDUAL * residual +
      ACCESO_OMEGA_ATTACK * attack +
      ACCESO_OMEGA_DEFENSE * defense
  );
  return { expected, margin, result, residual, attack, defense, omega };
}

export function jornadaTeamScore(input: JornadaTeamInput): number {
  return jornadaTeamParts(input).omega;
}

function repeatBand(band: AccesoBand, n: number): AccesoBand[] {
  return Array.from({ length: n }, () => band);
}

const FORMATION_BANDS: Record<AccesoFormation, AccesoBand[]> = {
  '4-3-3': ['GK', ...repeatBand('DEF', 4), ...repeatBand('MID', 3), ...repeatBand('FWD', 3)],
  '4-2-3-1': ['GK', ...repeatBand('DEF', 4), ...repeatBand('MID', 2), ...repeatBand('MID', 3), ...repeatBand('FWD', 1)],
  '4-4-2': ['GK', ...repeatBand('DEF', 4), ...repeatBand('MID', 4), ...repeatBand('FWD', 2)],
  '3-5-2': ['GK', ...repeatBand('DEF', 3), ...repeatBand('MID', 5), ...repeatBand('FWD', 2)],
};

/** Slot bands for a formation. Slot 1 is always GK. */
export function bandsForFormation(formation: string): AccesoBand[] {
  const key = formation.replace(/\s+/g, '') as AccesoFormation;
  const known = FORMATION_BANDS[key];
  if (known) return known;
  const parts = formation
    .split(/[-\s]/)
    .map((n) => Number(n))
    .filter((n) => n > 0 && n < 11);
  const out: AccesoBand[] = ['GK'];
  const fallback: AccesoBand[] = ['DEF', 'MID', 'FWD'];
  for (let i = 0; i < parts.length; i++) {
    const band = fallback[Math.min(i, fallback.length - 1)] ?? 'FWD';
    const n = parts[i] ?? 0;
    for (let k = 0; k < n; k++) out.push(band);
  }
  while (out.length < 11) out.push('FWD');
  return out.slice(0, 11);
}

export type AccesoPoolPlayer = {
  id: string;
  teamAbbr: string;
  position: LineupPos;
  acceso: number;
};

export type AccesoXiPick<T extends AccesoPoolPlayer> = {
  formation: AccesoFormation;
  mean: number;
  players: (T & { slot: number })[];
};

function allowed(player: AccesoPoolPlayer, band: AccesoBand): boolean {
  if (player.position === 'GK') return band === 'GK';
  if (band === 'GK') return false;
  if (player.position === '?') return true;
  return player.position === band;
}

function fillFormation<T extends AccesoPoolPlayer>(
  formation: AccesoFormation,
  pool: T[]
): (T & { slot: number })[] | null {
  const bands = bandsForFormation(formation);
  const used = new Set<string>();
  const clubCount = new Map<string, number>();
  const picked: (T & { slot: number })[] = [];
  const ranked = [...pool].sort((a, b) => b.acceso - a.acceso || a.id.localeCompare(b.id));

  for (let i = 0; i < bands.length; i++) {
    const band = bands[i] ?? 'MID';
    const next = ranked.find((p) => {
      if (used.has(p.id)) return false;
      if (!allowed(p, band)) return false;
      const n = clubCount.get(p.teamAbbr) ?? 0;
      return n < ACCESO_MAX_PER_CLUB;
    });
    if (!next) return null;
    used.add(next.id);
    clubCount.set(next.teamAbbr, (clubCount.get(next.teamAbbr) ?? 0) + 1);
    picked.push({ ...next, slot: i + 1 });
  }
  return picked;
}

/** Greedy XI per formation; keep the lineup with the highest mean Acceso index. */
export function pickAccesoXi<T extends AccesoPoolPlayer>(pool: T[]): AccesoXiPick<T> | null {
  let best: AccesoXiPick<T> | null = null;
  for (const formation of ACCESO_FORMATIONS) {
    const players = fillFormation(formation, pool);
    if (!players || players.length < 11) continue;
    const mean = players.reduce((s, p) => s + p.acceso, 0) / players.length;
    if (!best || mean > best.mean) best = { formation, mean, players };
  }
  return best;
}
