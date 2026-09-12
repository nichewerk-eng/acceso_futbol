import { LIGA_MX_CLUBS } from '@/config/clubs';
import { ligaMxCrestById } from '@/config/ligaMxLogos';
import type { ClubRef } from './types';

/** Remotion staticFile path (under /public). */
export function clubLogoStatic(id: string): string {
  const src = ligaMxCrestById(id);
  if (!src) return 'liga_mx_logos/liga-mx-logo.png';
  if (src.startsWith('http')) return 'liga_mx_logos/liga-mx-logo.png';
  return src.replace(/^\//, '');
}

export function clubRef(id: string): ClubRef {
  const club = LIGA_MX_CLUBS.find((c) => c.id === id);
  return {
    id,
    name: club?.name ?? id,
    abbr: club?.abbreviation ?? id.slice(0, 3).toUpperCase(),
    logo: clubLogoStatic(id),
  };
}

/** Brand-ish fills for split treatments (broadcast, not official Pantone). */
export const CLUB_COLORS: Record<string, string> = {
  america: '#FFD100',
  atlante: '#002F6C',
  atlas: '#C8102E',
  chivas: '#E31837',
  'cruz-azul': '#0033A0',
  juarez: '#00A651',
  leon: '#006341',
  monterrey: '#0B2343',
  necaxa: '#E31837',
  pachuca: '#003DA5',
  puebla: '#0033A0',
  pumas: '#002554',
  queretaro: '#1B1B1B',
  'san-luis': '#C8102E',
  santos: '#007A33',
  tigres: '#F7B718',
  tijuana: '#C8102E',
  toluca: '#C8102E',
};

export function clubColor(id: string): string {
  return CLUB_COLORS[id] ?? '#F54F1B';
}
