import { cableMoments } from '@/config/moments';
import type { Story } from './types';

/** Acceso-owned takes for Lo que prende — on-site /momento pages. */
export function accesoEditorialStories(): Story[] {
  return cableMoments().map((m) => ({
    id: `acceso-${m.id}`,
    title: m.headline,
    summary: m.body,
    url: `/momento/${m.id}`,
    sourceId: 'acceso' as const,
    sourceLabel: 'Acceso',
    publishedAt: m.publishedAt
      ? new Date(m.publishedAt).toISOString()
      : new Date().toISOString(),
    image: m.image,
    accesoLine: m.accesoLine ?? m.body,
  }));
}
