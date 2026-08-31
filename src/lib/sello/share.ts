import { clubById } from '@/config/clubMatch';
import type { SelloMint } from './types';

export function selloPath(league: string, id: string): string {
  return `/sello/${league}/${id}`;
}

export function selloCardPath(
  league: string,
  id: string,
  clubId?: string | null
): string {
  const q = clubId ? `?club=${encodeURIComponent(clubId)}` : '';
  return `/sello/${league}/${id}/card${q}`;
}

export function selloFileName(mint: SelloMint): string {
  const pair = `${mint.home.abbreviation}-${mint.away.abbreviation}`.toLowerCase();
  const kind = mint.kind;
  return `AF-SELLO-${pair}-${kind}.png`;
}

export function parseSelloClub(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim().toLowerCase();
  if (id === 'el-tri') return 'el-tri';
  return clubById(id)?.id ?? null;
}

export function selloShareCopy(mint: SelloMint): { title: string; text: string } {
  const pair = `${mint.home.abbreviation} ${mint.home.score}-${mint.away.score} ${mint.away.abbreviation}`;
  const title =
    mint.kind === 'pre'
      ? `${mint.home.abbreviation} vs ${mint.away.abbreviation} · Acceso Futbol`
      : `${pair} · Acceso Futbol`;
  const text = [mint.headline, mint.line].filter(Boolean).join(' ');
  return { title, text };
}
