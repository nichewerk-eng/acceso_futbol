import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
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
  // v3: spoken podcast voice (human host, not news-wire readout)
  return `cable-brief-v3-${briefBucket(now)}-${style}`;
}

function pickStories(stories: Story[], limit = 6): Story[] {
  const withBody = stories.filter((s) => (s.summary?.trim().length ?? 0) > 40);
  const rest = stories.filter((s) => !withBody.includes(s));
  return [...withBody, ...rest].slice(0, limit);
}

function storyBlurb(s: Story): string {
  const deck = s.summary?.trim();
  const take = s.accesoLine?.trim();
  if (deck && take) return `${s.title}. ${deck} Y la lectura Acceso: ${take}`;
  if (deck) return `${s.title}. ${deck}`;
  if (take) return `${s.title}. ${take}`;
  return s.title;
}

function jornadaBlurb(j: JornadaOverview | null): string {
  if (!j) return '';
  const left = j.upcoming
    .slice(0, 3)
    .map((f) => `${f.home.name} contra ${f.away.name}`)
    .join(', ');
  const sealed = j.played
    .slice(0, 3)
    .map((f) => `${f.home.name} ${f.home.score ?? 0} a ${f.away.score ?? 0} frente a ${f.away.name}`)
    .join('. ');
  const parts = [
    `En la ${j.label} ya van ${j.played.length + j.live.length} partidos sellados y quedan ${j.upcoming.length} por jugar.`,
    sealed ? `De lo que ya se jugó: ${sealed}.` : '',
    left ? `Todavía faltan ${left}.` : 'La fecha ya casi se cierra.',
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
      ? `Oye, bienvenido a Acceso. Esto es el briefing del cable: unos minutos contigo, como si estuviéramos en el coche o en la cocina, poniéndonos al día de Liga MX y El Tri sin ahogarnos en el scroll. Yo te platico lo que prende, con nombre de la fuente, y tú decides si te metes al artículo. Arrancamos.`
      : style === 'tactico'
        ? `Hola. Acceso Radio, briefing del cable. Vamos a leer con calma lo que están soltando ESPN, Mediotiempo, TUDN y Marca: qué importa de verdad para la fecha y dónde vale la pena poner el ojo. Sin inventar, sin gritar. Como un podcast corto antes de la jornada. Empezamos.`
        : `Desde este lado del puente — México o Estados Unidos, da igual — Acceso abre el micrófono. Un rato de cable para la afición binacional: lo que se discute en la CDMX y lo que se vive en Texas, California o Chicago. Siéntate un minuto. Te lo platico.`;

  const leadSeg = lead
    ? style === 'tactico'
      ? `Mira, ${lead.sourceLabel} está marcando el tono del día. ${storyBlurb(lead)}. Quédate con el marco, no con el clickbait. Si quieres el detalle fino, abre la fuente; aquí te dejo la lectura para que no llegues en frío.`
      : `Lo primero que te quiero contar: según ${lead.sourceLabel}, ${storyBlurb(lead)}. Eso es lo que está arriba del cable. Si te late el tema, léelo completo allá; yo te dejo el pulso para la sobremesa.`
    : `Hoy el cable viene un poco corto, y está bien. Cuando no hay decks, Acceso no inventa: te digo la verdad y te mando la mirada a la cancha.`;

  const chunks: ShowSegment[] = [
    { id: 'brief-1', text: open },
    { id: 'brief-2', text: leadSeg },
  ];

  const rest = picks.slice(1);
  const bridges = [
    'Ojo con esto también.',
    'Y fíjate en otra cosa.',
    'Sigo, porque hay más en el cable.',
    'Una más que vale la pena.',
  ];
  for (let i = 0; i < rest.length; i += 2) {
    const a = rest[i];
    const b = rest[i + 1];
    const bridge = bridges[chunks.length % bridges.length];
    const body = b
      ? `${bridge} ${a.sourceLabel} trae esto: ${storyBlurb(a)}. Y del otro lado, ${b.sourceLabel} dice: ${storyBlurb(b)}. Dos conversaciones distintas, misma liga: esto es lo que se está cocinando en el fútbol mexicano ahorita.`
      : `${bridge} ${a.sourceLabel}: ${storyBlurb(a)}. Guárdalo. Es de esos temas que luego te llegan en el WhatsApp del grupo y ya vas un paso adelante.`;
    chunks.push({ id: `brief-${chunks.length + 1}`, text: body });
  }

  if (jLine) {
    chunks.push({
      id: `brief-${chunks.length + 1}`,
      text:
        style === 'tactico'
          ? `Bajemos un segundo a la cancha, que el cable sin resultados se queda a medias. ${jLine} Si tu club ya jugó, el debate es lectura; si todavía falta, la cabina sigue con trabajo.`
          : `Y ya, un giro a la cancha, porque sin partido el cable es puro humo. ${jLine} Cuando quieras entrar a la cabina o al pulso, aquí estamos.`,
    });
  }

  chunks.push({
    id: `brief-${chunks.length + 1}`,
    text:
      style === 'puente'
        ? `Te dejo hasta aquí. Fuentes afuera, voz aquí: tocas el artículo si te late, nosotros no te lo leemos entero. Estés en México o del otro lado del puente, el cable es el mismo. Vuelve en un par de horas por el siguiente corte, o métete a la cabina cuando juegue tu gente. Nos escuchamos.`
        : `Eso fue el briefing. Gracias por escucharnos de verdad, no solo por pasar el feed. Fuentes afuera, voz aquí, cancha al centro. Vuelve al cable cuando quieras, o entra a la cabina si tu club pide micrófono. Hasta el próximo corte.`,
  });

  return chunks;
}

async function rewriteCableBrief(
  style: RadioStyle,
  stories: Story[],
  jornada: JornadaOverview | null,
  draft: ShowSegment[]
): Promise<ShowSegment[]> {
  if (!anthropicEnabled()) return draft;

  try {
    const persona = PERSONAS[style];
    const voiceHint =
      style === 'caliente'
        ? 'Energía de amigo que te habla del partido: cálido, opinado, sin gritar todo el tiempo.'
        : style === 'tactico'
          ? 'Host analítico de podcast: calmado, claro, como si explicaras en la mesa.'
          : 'Host binacional: cercano, puente MX–US, como conversación en el coche.';
    const raw = await anthropicChat({
      system: `${persona.system.replace(/Máximo 2 oraciones\./gi, 'Bloques hablados de podcast.')}

Eres el host de un PODCAST corto de Acceso Futbol llamado "Briefing del cable" (~5 minutos). ${voiceHint}

REGLAS DE VOZ (crítico):
- Suena a persona hablando a un micrófono, NO a boletín ni a titular leído.
- Habla en segunda persona (tú / oye / mira / fíjate). Usa contracciones y ritmo oral del español mexicano.
- Cada bloque fluye al siguiente; evita listas, "primero/segundo/tercer punto", y jerga de productora ("corte", "señal", "deck") salvo que suene natural.
- Puedes hacer una pregunta retórica corta o un aparte ("la neta…", "ojo…") si ayuda.
- ${draft.length} bloques. Cada bloque: 4 a 7 oraciones habladas, para oídos.
- Atribuye fuentes por nombre (ESPN, Mediotiempo, TUDN, Marca). No inventes goles, citas ni hechos.
- No leas artículos enteros: solo titulares, resúmenes y tomas Acceso del input.
- Reescribe el draft para que suene más humano; conserva los hechos.
- Responde SOLO JSON: [{"id":"...","text":"..."}]`,
      user: JSON.stringify({
        kind: 'cable-brief-podcast',
        goal: 'El oyente debe sentir que escucha un podcast, no un resumen de noticias.',
        jornada: jornada
          ? {
              label: jornada.label,
              played: jornada.played.length,
              live: jornada.live.length,
              upcoming: jornada.upcoming.map(
                (f) => `${f.home.name} vs ${f.away.name}`
              ),
              results: jornada.played.slice(0, 5).map(
                (f) =>
                  `${f.home.name} ${f.home.score ?? 0}-${f.away.score ?? 0} ${f.away.name}`
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
      temperature: 0.8,
      maxTokens: 1800,
    });
    if (!raw) return draft;
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
