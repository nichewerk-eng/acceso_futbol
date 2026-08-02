import type { Story } from '@/lib/news/types';
import type { JornadaOverview } from '@/lib/sports/jornada';
import {
  beatKey,
  getBeat,
  listBeats,
  pruneRadioCache,
  setBeat,
  type RadioBeat,
} from './cache';
import { PERSONAS, type RadioStyle } from './personas';
import type { ShowSegment } from './show';
import { radioEnabled, synthesize } from './tts';

/** Regenerate the cable brief on this cadence. */
export const CABLE_BRIEF_TTL_MS = 2 * 60 * 60 * 1000;

export type CableBriefPayload = {
  id: string;
  style: RadioStyle;
  generatedAt: string;
  expiresAt: string;
  enabled: boolean;
  mode: 'brief';
  title: string;
  sources: string[];
  storyCount: number;
  jornadaLabel: string | null;
  beats: Pick<RadioBeat, 'id' | 'text' | 'kind' | 'audioPath' | 'createdAt'>[];
};

function briefBucket(now = Date.now()) {
  return Math.floor(now / CABLE_BRIEF_TTL_MS);
}

export function cableBriefId(style: RadioStyle, now = Date.now()) {
  return `cable-brief-v2-${briefBucket(now)}-${style}`;
}

function pickStories(stories: Story[], limit = 6): Story[] {
  const withBody = stories.filter((s) => (s.summary?.trim().length ?? 0) > 40);
  const rest = stories.filter((s) => !withBody.includes(s));
  return [...withBody, ...rest].slice(0, limit);
}

function storyBlurb(s: Story): string {
  const deck = s.summary?.trim();
  const take = s.accesoLine?.trim();
  if (deck && take) return `${s.title}. ${deck} Toma Acceso: ${take}`;
  if (deck) return `${s.title}. ${deck}`;
  if (take) return `${s.title}. Toma Acceso: ${take}`;
  return s.title;
}

function jornadaBlurb(j: JornadaOverview | null): string {
  if (!j) return '';
  const left = j.upcoming
    .slice(0, 3)
    .map((f) => `${f.home.abbreviation} contra ${f.away.abbreviation}`)
    .join(', ');
  const sealed = j.played
    .slice(0, 3)
    .map((f) => `${f.home.abbreviation} ${f.home.score ?? 0}-${f.away.score ?? 0} ${f.away.abbreviation}`)
    .join('; ');
  const parts = [
    `${j.label}: ${j.played.length + j.live.length} sellados, ${j.upcoming.length} por jugar.`,
    sealed ? `Entre lo jugado: ${sealed}.` : '',
    left ? `Quedan: ${left}.` : 'Fecha casi cerrada.',
  ];
  return parts.filter(Boolean).join(' ');
}

/** Deterministic ~5 min shape: open + lead + story pairs + jornada + close. */
export function templateCableBrief(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle
): ShowSegment[] {
  const picks = pickStories(stories, 6);
  const lead = picks[0];
  const jLine = jornadaBlurb(jornada);

  const open =
    style === 'caliente'
      ? `Acceso Radio, briefing del cable. Cinco minutos para enterarte de lo que prende en Liga MX y El Tri sin ahogarte en el scroll. Titulares con nombre y apellido de la fuente, toma Acceso al final de cada corte. Arrancamos.`
      : style === 'tactico'
        ? `Briefing Acceso. Lectura fría del cable: qué dicen ESPN, Mediotiempo, TUDN y Marca, qué implica para la fecha, y dónde poner la atención. Sin inventar goles. Sin leer el artículo completo. Empezamos.`
        : `Desde México y Estados Unidos, Acceso abre el cable. Un briefing para la afición binacional: lo que se discute en la CDMX y lo que se vive en Texas, California o Chicago. Micrófono abierto.`;

  const leadSeg = lead
    ? style === 'tactico'
      ? `Apertura del briefing. ${lead.sourceLabel} marca el tono de la jornada mediática: ${storyBlurb(lead)}. Quédate con la señal, no con el clickbait. Si te importa el detalle, toca la fuente; aquí te dejamos el marco.`
      : `Lo que prende arriba del cable: según ${lead.sourceLabel}, ${storyBlurb(lead)}. Eso es portada. Lee allá si quieres el texto largo; aquí te dejamos el pulso y la toma para que no llegues en frío a la sobremesa.`
    : `El cable viene corto hoy, pero la cabina sigue abierta. Cuando falten decks, Acceso no inventa: marca el silencio y apunta a la cancha.`;

  const chunks: ShowSegment[] = [
    { id: 'brief-1', text: open },
    { id: 'brief-2', text: leadSeg },
  ];

  const rest = picks.slice(1);
  for (let i = 0; i < rest.length; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    const body = b
      ? `Seguimos el cable. Primero, ${a.sourceLabel}: ${storyBlurb(a)}. Segundo corte, ${b.sourceLabel}: ${storyBlurb(b)}. Dos señales, una lectura: qué se está negociando en la conversación del fútbol mexicano ahora mismo.`
      : `Otro punto del cable. ${a.sourceLabel}: ${storyBlurb(a)}. Guárdalo: es de esos titulares que después aparecen en la cabina y en el grupo del WhatsApp.`;
    chunks.push({ id: `brief-${chunks.length + 1}`, text: body });
  }

  if (jLine) {
    chunks.push({
      id: `brief-${chunks.length + 1}`,
      text:
        style === 'tactico'
          ? `Corte a la cancha. ${jLine} Eso ancla el ruido del cable a resultados y pendientes. Si tu club ya selló, el debate es lectura; si falta por jugar, la cabina todavía tiene trabajo.`
          : `Y ahora la fecha, porque el cable sin cancha es puro humo. ${jLine} El pulso, la jornada y la cabina siguen vivos en Acceso cuando quieras entrar.`,
    });
  }

  chunks.push({
    id: `brief-${chunks.length + 1}`,
    text:
      style === 'puente'
        ? `Cierre del briefing Acceso. Titulares con atribución: tocas la fuente, no republicamos el artículo. Si estás en México o del otro lado del puente, el cable es el mismo y la toma también. Vuelve en un par de horas por el siguiente corte, o métete a la cabina cuando juegue tu gente.`
        : `Eso es el briefing Acceso. Fuentes afuera, voz aquí, cancha al centro. Vuelve al cable para leer, o entra a la cabina cuando tu club pida micrófono. Nos escuchamos en el próximo corte.`,
  });

  return chunks;
}

async function rewriteCableBrief(
  style: RadioStyle,
  stories: Story[],
  jornada: JornadaOverview | null,
  draft: ShowSegment[]
): Promise<ShowSegment[]> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return draft;

  try {
    const persona = PERSONAS[style];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RADIO_MODEL ?? 'gpt-4o-mini',
        temperature: 0.65,
        max_tokens: 1400,
        messages: [
          {
            role: 'system',
            content: `${persona.system.replace(/Máximo 2 oraciones\./gi, 'Bloques de radio más largos.')} Escribes un podcast briefing del CABLE Acceso (~5 minutos). ${draft.length} bloques. Cada bloque: 3 a 5 oraciones en español mexicano. Atribuye fuentes por nombre (ESPN, Mediotiempo, TUDN, Marca). No inventes goles, declaraciones ni hechos. No leas artículos completos: usa solo titulares, decks y tomas Acceso. Responde SOLO JSON: [{"id":"...","text":"..."}]`,
          },
          {
            role: 'user',
            content: JSON.stringify({
              kind: 'cable-brief',
              jornada: jornada
                ? {
                    label: jornada.label,
                    played: jornada.played.length,
                    live: jornada.live.length,
                    upcoming: jornada.upcoming.map(
                      (f) => `${f.home.abbreviation}-${f.away.abbreviation}`
                    ),
                    results: jornada.played.slice(0, 5).map(
                      (f) =>
                        `${f.home.abbreviation} ${f.home.score ?? 0}-${f.away.score ?? 0} ${f.away.abbreviation}`
                    ),
                  }
                : null,
              stories: pickStories(stories, 6).map((s) => ({
                source: s.sourceLabel,
                title: s.title,
                summary: s.summary?.slice(0, 220) ?? '',
                accesoLine: s.accesoLine ?? '',
              })),
              draft,
            }),
          },
        ],
      }),
    });
    if (!res.ok) return draft;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start < 0 || end < 0) return draft;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as ShowSegment[];
    if (!Array.isArray(parsed) || parsed.length < 3) return draft;
    return parsed
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 20)
      .map((s, i) => ({
        id: typeof s.id === 'string' ? s.id : `brief-${i + 1}`,
        text: s.text.trim(),
      }));
  } catch {
    return draft;
  }
}

export async function buildCableBriefSegments(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle
): Promise<ShowSegment[]> {
  const draft = templateCableBrief(stories, jornada, style);
  return rewriteCableBrief(style, stories, jornada, draft);
}

async function ensureBriefBeat(
  briefId: string,
  style: RadioStyle,
  seg: ShowSegment
): Promise<RadioBeat> {
  const key = beatKey(briefId, seg.id, style);
  const existing = getBeat(key);
  if (existing?.audioPath || (existing && !process.env.ELEVENLABS_API_KEY)) return existing;

  const text = existing?.text ?? seg.text;
  const audioPath = await synthesize(key, text, style);
  const beat: RadioBeat = {
    id: key,
    matchId: briefId,
    style,
    text,
    kind: 'show',
    createdAt: existing?.createdAt ?? Date.now(),
    audioPath: audioPath ?? existing?.audioPath,
  };
  setBeat(beat);
  pruneRadioCache();
  return beat;
}

export async function buildCableBriefFeed(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle,
  now = new Date()
): Promise<CableBriefPayload> {
  const id = cableBriefId(style, now.getTime());
  const enabled = radioEnabled();
  const picks = pickStories(stories, 6);
  const sources = [...new Set(picks.map((s) => s.sourceLabel))];

  if (!enabled) {
    return {
      id,
      style,
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CABLE_BRIEF_TTL_MS).toISOString(),
      enabled: false,
      mode: 'brief',
      title: 'Briefing del cable',
      sources,
      storyCount: picks.length,
      jornadaLabel: jornada?.label ?? null,
      beats: [],
    };
  }

  let beats = listBeats(id, style).filter((b) => b.kind === 'show');
  if (beats.length < 3) {
    const segments = await buildCableBriefSegments(stories, jornada, style);
    for (const seg of segments) {
      await ensureBriefBeat(id, style, seg);
    }
    beats = listBeats(id, style).filter((b) => b.kind === 'show');
  } else {
    // Re-hydrate audio if the process kept beat text but lost buffers.
    for (const b of beats) {
      if (b.audioPath) continue;
      const parts = b.id.split(':');
      const eventId = parts.length >= 3 ? parts.slice(1, -1).join(':') : `brief-${parts.length}`;
      await ensureBriefBeat(id, style, { id: eventId, text: b.text });
    }
    beats = listBeats(id, style).filter((b) => b.kind === 'show');
  }

  return {
    id,
    style,
    generatedAt: now.toISOString(),
    expiresAt: new Date((briefBucket(now.getTime()) + 1) * CABLE_BRIEF_TTL_MS).toISOString(),
    enabled: true,
    mode: 'brief',
    title: 'Briefing del cable',
    sources,
    storyCount: picks.length,
    jornadaLabel: jornada?.label ?? null,
    beats: beats.map((b) => ({
      id: b.id,
      text: b.text,
      kind: b.kind,
      audioPath: b.audioPath,
      createdAt: b.createdAt,
    })),
  };
}
