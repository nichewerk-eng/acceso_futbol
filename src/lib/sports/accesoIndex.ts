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
