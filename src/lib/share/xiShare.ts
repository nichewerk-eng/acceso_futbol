import { clubIdentityFromAbbr } from '@/config/clubIdentity';
import type { LineupPlayer, MatchSnapshot, TeamLineup } from '@/lib/sports/types';

export function xiConfirmed(team: TeamLineup): boolean {
  return team.starters.length >= 11;
}

export function matchHasXi(match: Pick<MatchSnapshot, 'lineups'>): boolean {
  return (match.lineups ?? []).some((t) => t.starters.length >= 7);
}

export function xiRows(team: TeamLineup): LineupPlayer[][] {
  const xi = team.starters.slice(0, 11);
  const parts = (team.formation ?? '')
    .split(/[-\s]/)
    .map((n) => Number(n))
    .filter((n) => n > 0 && n < 11);
  const sum = parts.reduce((a, b) => a + b, 0);
  const slotted = xi.every((p) => p.slot != null && p.slot > 0);

  if (slotted && xi.length >= 10 && sum === xi.length - 1) {
    const sorted = [...xi].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
    const rows: LineupPlayer[][] = [sorted.slice(0, 1)];
    let i = 1;
    for (const n of parts) {
      rows.push(sorted.slice(i, i + n));
      i += n;
    }
    return rows.filter((r) => r.length > 0);
  }

  const order = ['GK', 'DEF', 'MID', 'FWD', '?'] as const;
  return order.map((pos) => xi.filter((p) => p.position === pos)).filter((r) => r.length > 0);
}

export type XiPin = {
  player: LineupPlayer;
  /** 0–100, left → right as the XI attacks up the board. */
  x: number;
  /** 0–100, GK near 90, forwards near 12. */
  y: number;
};

export function xiPins(team: TeamLineup): XiPin[] {
  const rows = xiRows(team);
  const n = rows.length;
  if (n === 0) return [];

  return rows.flatMap((row, ri) => {
    const y = n === 1 ? 50 : 88 - (ri / (n - 1)) * 74;
    const m = row.length;
    return row.map((player, ci) => {
      const x = m === 1 ? 50 : 14 + (ci / (m - 1)) * 72;
      return { player, x, y };
    });
  });
}

export function xiShortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

export type XiKit = {
  shirt: string;
  number: string;
  shorts: string;
};

function hexLum(hex: string): number {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return 0.5;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isGold(hex: string): boolean {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r > 180 && g > 120 && b < 90;
}

function onShirt(shirt: string, ink: string, signal: string, onInk: string): string {
  const light = hexLum(shirt) > 0.55;
  if (light) return hexLum(ink) < 0.45 ? ink : '#0c0c0c';
  if (Math.abs(hexLum(signal) - hexLum(shirt)) > 0.28) return signal;
  return onInk;
}

/** Home kit from club palette. GK wears the other plane so they read on the pitch. */
export function xiKit(abbr: string, position?: string | null): XiKit {
  const club = clubIdentityFromAbbr(abbr);
  if (!club) {
    return { shirt: '#f6f5f2', number: '#0c0c0c', shorts: '#0c0c0c' };
  }
  const { ink, signal, onInk } = club.palette;
  const goldOnBlack = hexLum(ink) < 0.08 && isGold(signal);
  const fieldShirt = goldOnBlack ? signal : ink;
  const gk = position === 'GK';
  const shirt = gk ? (fieldShirt === ink ? signal : ink) : fieldShirt;
  const number = onShirt(shirt, ink, signal, onInk);
  const shorts = hexLum(signal) > 0.85 && !gk ? signal : ink;
  return { shirt, number, shorts };
}

function lineFor(team: TeamLineup): string {
  const names = team.starters
    .slice(0, 11)
    .map((p) => (p.jersey != null ? `${p.jersey} ${p.name}` : p.name))
    .join(' · ');
  const form = team.formation ? ` ${team.formation}` : '';
  const tag = xiConfirmed(team) ? 'XI' : 'XI (parcial)';
  return `${team.abbreviation}${form} · ${tag}\n${names}`;
}

export function xiShareCopy(match: MatchSnapshot): { title: string; text: string } {
  const sides = match.lineups ?? [];
  const title = `XI · ${match.home.abbreviation} vs ${match.away.abbreviation}`;
  if (sides.length === 0) {
    return { title, text: 'Alineaciones en Acceso Futbol' };
  }
  return { title, text: sides.map(lineFor).join('\n\n') };
}
