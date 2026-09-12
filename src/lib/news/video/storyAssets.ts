import { LIGA_MX_CLUBS } from '@/config/clubs';
import { clubRef } from '@/lib/toma/video/clubAssets';
import type { ClubRef } from '@/lib/toma/video/types';
import type { Story } from '@/lib/news/types';
import type { NewsStoryBeat } from './types';

/** Best-effort club match from headline/summary text. */
export function clubFromText(text: string): ClubRef | undefined {
  const hay = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  const aliases: { id: string; needles: string[] }[] = [
    { id: 'america', needles: ['america', 'americanista'] },
    { id: 'chivas', needles: ['chivas', 'guadalajara', 'tapat'] },
    { id: 'tigres', needles: ['tigres', 'uanl'] },
    { id: 'monterrey', needles: ['monterrey', 'rayados'] },
    { id: 'cruz-azul', needles: ['cruz azul', 'cementero'] },
    { id: 'pumas', needles: ['pumas', 'unam'] },
    { id: 'toluca', needles: ['toluca', 'diablos'] },
    { id: 'atlas', needles: ['atlas'] },
    { id: 'pachuca', needles: ['pachuca', 'tuzos'] },
    { id: 'santos', needles: ['santos'] },
    { id: 'leon', needles: ['leon', 'león'] },
    { id: 'necaxa', needles: ['necaxa'] },
    { id: 'puebla', needles: ['puebla'] },
    { id: 'queretaro', needles: ['queretaro', 'querétaro'] },
    { id: 'tijuana', needles: ['tijuana', 'xolos'] },
    { id: 'juarez', needles: ['juarez', 'juárez'] },
    { id: 'san-luis', needles: ['san luis'] },
    { id: 'atlante', needles: ['atlante'] },
    { id: 'mazatlan', needles: ['mazatlan', 'mazatlán'] },
  ];
  for (const a of aliases) {
    if (a.needles.some((n) => hay.includes(n.normalize('NFD').replace(/\p{M}/gu, '')))) {
      return clubRef(a.id);
    }
  }
  for (const c of LIGA_MX_CLUBS) {
    const n = c.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');
    if (hay.includes(n)) return clubRef(c.id);
  }
  return undefined;
}

export function storyBeatsFromStories(stories: Story[]): NewsStoryBeat[] {
  return stories.map((s) => ({
    title: s.title,
    sourceLabel: s.sourceLabel,
    summary: s.summary || undefined,
    accesoLine: s.accesoLine || undefined,
    team: clubFromText(`${s.title} ${s.summary} ${s.accesoLine ?? ''}`),
  }));
}
