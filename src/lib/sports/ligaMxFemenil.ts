import { scheduleAbbr } from './ligaMxAbbr';

/** Sportmonks names the side "América W" / "Cruz Azul W" with no short_code. */
const NAME_TO_ABBR: Record<string, string> = {
  america: 'AME',
  atlas: 'ATS',
  atlante: 'ATL',
  'cruz azul': 'CAZ',
  guadalajara: 'GDL',
  chivas: 'GDL',
  juarez: 'JUA',
  leon: 'LEO',
  monterrey: 'MTY',
  necaxa: 'NCX',
  pachuca: 'PAC',
  puebla: 'PUE',
  'pumas unam': 'UNAM',
  pumas: 'UNAM',
  unam: 'UNAM',
  queretaro: 'QRO',
  'atletico san luis': 'ASL',
  'san luis': 'ASL',
  'santos laguna': 'SAN',
  santos: 'SAN',
  'tigres uanl': 'UANL',
  tigres: 'UANL',
  uanl: 'UANL',
  tijuana: 'TIJ',
  toluca: 'TOL',
};

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/** Strip Sportmonks "W" / Femenil suffix for display + matching. */
export function femenilTeamName(name: string): string {
  return name
    .replace(/\s+femenil\b/gi, '')
    .replace(/\s+w$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameKey(name: string): string {
  return fold(femenilTeamName(name))
    .replace(/\b(f\.?c\.?|c\.?f\.?|club|deportivo)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function femenilAbbrFromName(name?: string | null): string {
  if (!name) return 'CLB';
  const key = nameKey(name);
  if (NAME_TO_ABBR[key]) return NAME_TO_ABBR[key];
  const parts = key.split(' ').filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  if (last && NAME_TO_ABBR[last]) return NAME_TO_ABBR[last];
  const letters = key.replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
  return scheduleAbbr(letters || 'CLB');
}

export function femenilTeamAbbr(shortCode?: string | null, name?: string | null): string {
  const raw = (shortCode ?? '').trim().toUpperCase();
  if (raw && raw !== 'W') return scheduleAbbr(raw);
  return femenilAbbrFromName(name);
}

/** Apertura 2026 Femenil — Sportmonks has no group entity; official board is two groups of 9. */
export const FEMENIL_GROUP_A = new Set([
  'UANL',
  'MTY',
  'TOL',
  'CAZ',
  'LEO',
  'QRO',
  'JUA',
  'ATL',
  'SAN',
]);
export const FEMENIL_GROUP_B = new Set([
  'AME',
  'GDL',
  'PAC',
  'TIJ',
  'UNAM',
  'ASL',
  'ATS',
  'NCX',
  'PUE',
]);

/** Top 4 in each group go to Liguilla. */
export const FEMENIL_LIGUILLA_SPOTS = 4;

export type FemenilStandingGroup<T extends { position: number; pts: number; gf: number; gd: string; team: { abbreviation: string } }> = {
  id: 'a' | 'b';
  name: string;
  entries: T[];
};

function gdNum(gd: string): number {
  const n = Number(gd);
  return Number.isFinite(n) ? n : 0;
}

function rankGroup<T extends { position: number; pts: number; gf: number; gd: string }>(rows: T[]): T[] {
  return [...rows]
    .sort((a, b) => b.pts - a.pts || gdNum(b.gd) - gdNum(a.gd) || b.gf - a.gf)
    .map((row, i) => ({ ...row, position: i + 1 }));
}

export function splitFemenilStandings<
  T extends { position: number; pts: number; gf: number; gd: string; team: { abbreviation: string } },
>(entries: T[]): FemenilStandingGroup<T>[] {
  const a: T[] = [];
  const b: T[] = [];
  for (const row of entries) {
    const abbr = scheduleAbbr(row.team.abbreviation);
    if (FEMENIL_GROUP_A.has(abbr)) a.push(row);
    else b.push(row);
  }
  return [
    { id: 'a', name: 'Grupo A', entries: rankGroup(a) },
    { id: 'b', name: 'Grupo B', entries: rankGroup(b) },
  ];
}
