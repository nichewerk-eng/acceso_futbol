import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import type { Story } from '@/lib/news/types';
import { pickCableDisplayStories } from '@/lib/radio/cableBrief';
import { NEWS_OUTRO, withSpokenOutro } from '@/lib/radio/signOff';
import type { NewsBriefSlot } from '@/lib/radio/voiceSchedule';
import { briefDeskTitle } from '@/lib/radio/voiceSchedule';

/** Same lead + list the NEWS rail / briefing uses (not a rotated subset). */
export function briefingStories(stories: Story[]): Story[] {
  return pickCableDisplayStories(stories, 4);
}

export function storiesSourceHash(stories: Story[]): string {
  const raw = stories
    .map((s) => `${s.id}\n${s.title}\n${s.summary}\n${s.accesoLine ?? ''}`)
    .join('\n---\n');
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(h, 31) + raw.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function packStories(stories: Story[], desk: string, slot: NewsBriefSlot): string {
  const lines = stories.map((s, i) => {
    const role = i === 0 ? 'LEAD (arriba del feed)' : `LISTA ${i}`;
    return [
      `${role} · ${s.sourceLabel}`,
      `Título: ${s.title}`,
      s.summary?.trim() ? `Resumen: ${s.summary.trim()}` : '',
      s.accesoLine?.trim() ? `Toma Acceso: ${s.accesoLine.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });
  return [
    `Título de escritorio: ${desk}`,
    `Corte: ${slot === 'am' ? 'mañana 8:00' : 'tarde 18:00'} México`,
    '',
    'Notas EN PANTALLA (única fuente, este orden):',
    lines.join('\n\n') || '(sin notas)',
  ].join('\n');
}

function cleanNarration(raw: string): string {
  return raw
    .split('\n')
    .map((l) =>
      l
        .replace(/^\s*(Alex|Mar|Narrador|Voz|Host)\s*:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .join('\n');
}

/**
 * One spoken overview from the NEWS stories on screen. TTS reads this verbatim.
 */
export async function writeNewsBriefNarration(
  stories: Story[],
  slot: NewsBriefSlot
): Promise<string | null> {
  if (!anthropicEnabled() || stories.length === 0) return null;
  const desk = briefDeskTitle(slot);
  const raw = await anthropicChat({
    system: `Eres el narrador de cabina de Acceso Futbol. Grabas el BRIEFING DE NOTICIAS, UNA sola voz, a partir de las notas que el fan ve en AF://NEWS. No inventas.

Voz:
- Relator de cabina mexicana, primera persona, color de mesa. No imita a nadie por nombre. No grita. Ni España ni Argentina.
- Español mexicano de México. Seco, adulto.

Formato:
- Prosa hablada corrida, 2 a 4 párrafos. UNA sola voz. PROHIBIDO diálogo, turnos, etiquetas o nombres de locutor.
- Abre UNA vez con el título de escritorio: "${desk}". Luego el overview.
- Cubre la nota LEAD primero, luego las de la lista EN ORDEN. No es un desfile de titulares: da el ángulo (resumen / toma Acceso).
- ~2 minutos 30 segundos. Máximo ~350 palabras. No alargues para llenar.
- Liga MX se escribe "Liga MX".
- PROHIBIDO relojes digitales. PROHIBIDO inventar hechos fuera de las notas.
- PROHIBIDO "oye bienvenido", arrancamos, gracias por escucharnos.
- Última frase, SIEMPRE exactamente: "${NEWS_OUTRO}"
- Sin em-dash.`,
    user: packStories(stories, desk, slot),
    temperature: 0.45,
    maxTokens: 900,
  });
  if (!raw) return null;
  const text = cleanNarration(raw);
  if (text.length < 120) return null;
  return withSpokenOutro(text, NEWS_OUTRO);
}
