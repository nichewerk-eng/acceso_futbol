import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import type { Story } from './types';

/** Cheap deterministic Acceso framing when Anthropic is off. */
export function templateAccesoLine(story: Story): string {
  const t = story.title.toLowerCase();
  if (t.includes('jornada') || t.includes('resultado')) {
    return 'Marcador frío. Nosotros te damos el porqué.';
  }
  if (t.includes('américa') || t.includes('america') || t.includes('chivas')) {
    return 'Cuando pesa el escudo, Acceso no se queda en el titular.';
  }
  if (t.includes('femenil')) {
    return 'Misma urgencia. Misma exigencia. Cobertura completa.';
  }
  if (t.includes('selección') || t.includes('el tri') || t.includes('méxico')) {
    return 'El Tri siempre es portada, aquí con contexto binacional.';
  }
  return 'Lee la fuente. Quédate por la toma Acceso.';
}

export async function maybeEnrichAccesoLines(stories: Story[]): Promise<Story[]> {
  if (!anthropicEnabled() || stories.length === 0) {
    return stories.map((s) => ({ ...s, accesoLine: s.accesoLine ?? templateAccesoLine(s) }));
  }

  // Enrich only the top few to control cost
  const head = stories.slice(0, 6);
  const rest = stories.slice(6).map((s) => ({ ...s, accesoLine: templateAccesoLine(s) }));

  try {
    const raw = await anthropicChat({
      system:
        'Eres editor de Acceso Futbol. Para cada titular escribe UNA línea corta (máx 14 palabras) con voz Acceso: opinión, urgencia, binacional MX-US. No inventes hechos. JSON array de strings en el mismo orden.',
      user: JSON.stringify(head.map((s) => ({ title: s.title, source: s.sourceLabel }))),
      temperature: 0.6,
      maxTokens: 220,
    });
    if (!raw) throw new Error('anthropic');
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    const arr = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : '[]') as string[];
    const enriched = head.map((s, i) => ({
      ...s,
      accesoLine: typeof arr[i] === 'string' && arr[i].trim() ? arr[i].trim() : templateAccesoLine(s),
    }));
    return [...enriched, ...rest];
  } catch {
    return stories.map((s) => ({ ...s, accesoLine: templateAccesoLine(s) }));
  }
}
