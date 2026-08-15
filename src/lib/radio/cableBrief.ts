import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import type { Story } from '@/lib/news/types';
import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
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
import { radioEnabled } from './tts';

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
  beats: Pick<RadioBeat, 'id' | 'text' | 'kind' | 'createdAt'>[];
};

function briefBucket(now = Date.now()) {
  return Math.floor(now / CABLE_BRIEF_TTL_MS);
}

export function cableBriefId(style: RadioStyle, now = Date.now()) {
  // v13: drop Brazilian Santos RSS false positives; TTS on play via /api/radio/tts
  return `cable-brief-v13-${briefBucket(now)}-${style}`;
}

const WIRE_SOURCES = new Set(['espn', 'espn-rss', 'mediotiempo', 'tudn', 'marca']);

function storyFreshness(s: Story): number {
  return s.publishedAt ? +new Date(s.publishedAt) : 0;
}

function storyBodyScore(s: Story): number {
  return (s.summary?.trim().length ?? 0) > 40 ? 1 : 0;
}

/**
 * Same lead + list order as StoriesRail ("Lo que prende") so the brief
 * narrates what the fan sees on screen — not a rotated subset.
 */
export function pickCableDisplayStories(stories: Story[], listLimit = 8): Story[] {
  const lead =
    stories.find((s) => s.sourceId === 'espn' && s.image) ??
    stories.find((s) => s.sourceId === 'espn') ??
    stories.find((s) => s.sourceId !== 'acceso' && s.image) ??
    stories.find((s) => s.sourceId !== 'acceso') ??
    stories.find((s) => s.sourceId === 'acceso' && s.image) ??
    stories.find((s) => s.sourceId === 'acceso') ??
    null;
  if (!lead) return stories.slice(0, listLimit + 1);
  const rest = stories.filter((s) => s.id !== lead.id).slice(0, listLimit);
  return [lead, ...rest];
}

/**
 * Top wire news for the brief. Acceso editorial is demoted (at most one take at the end).
 * Rotates the lead window every brief bucket so the cut changes every few hours.
 * @deprecated Prefer pickCableDisplayStories for the on-page cable brief.
 */
export function pickStories(stories: Story[], limit = 6, now = Date.now()): Story[] {
  const wire = stories.filter((s) => WIRE_SOURCES.has(s.sourceId));
  const acceso = stories.filter((s) => s.sourceId === 'acceso');
  const pool = (wire.length ? wire : stories.filter((s) => s.sourceId !== 'acceso')).slice();

  pool.sort((a, b) => {
    const body = storyBodyScore(b) - storyBodyScore(a);
    if (body) return body;
    return storyFreshness(b) - storyFreshness(a);
  });

  if (pool.length === 0) {
    return acceso.slice(0, limit);
  }

  const stack = pool.slice(0, Math.min(pool.length, Math.max(limit + 4, 10)));
  const bucket = briefBucket(now);
  const offset = stack.length <= limit ? 0 : (bucket * 2) % (stack.length - limit + 1);
  const picks = stack.slice(offset, offset + limit);

  if (picks.length < limit && acceso[0]) {
    picks.push(acceso[0]);
  }

  return picks.slice(0, limit);
}

export type CableBriefExtras = {
  /** Tonight / next slate from games-of-day. */
  day?: {
    dayKey: string;
    upcoming?: boolean;
    games: {
      home: string;
      away: string;
      state: string;
      score: string | null;
      league: string;
      clock?: string | null;
    }[];
  } | null;
  /** Compact Liga MX tabla snapshot. */
  tabla?: {
    season: string;
    top: { pos: number; team: string; pts: number }[];
    liguillaCut?: { pos: number; team: string; pts: number } | null;
  } | null;
};

/** Structured research packet — scripts are generated FROM this, never the other way around. */
export type CableDossier = {
  generatedAt: string;
  style: RadioStyle;
  /** Absolute clock for the model — do not invent relative days. */
  tempo: {
    mexicoNow: string;
    mexicoDayKey: string;
    framing: 'live' | 'today' | 'recent' | 'paused';
    lastResultLabel: string | null;
    hoursSinceLastResult: number | null;
    guidance: string;
  };
  cancha: {
    jornada: string | null;
    live: { match: string; score: string; clock?: string | null }[];
    results: { match: string; score: string; when: string; date: string }[];
    upcoming: { match: string; when: string; date: string }[];
    daySlate: CableBriefExtras['day'];
  };
  tabla: CableBriefExtras['tabla'];
  /** Wire notes = stories on the cable rail, in display order. */
  wire: {
    slot: 'lead' | 'list';
    index: number;
    id: string;
    source: string;
    title: string;
    summary: string;
    accesoLine: string;
  }[];
};

function fixtureScore(
  home: string | number | null | undefined,
  away: string | number | null | undefined
) {
  if (home == null || away == null || home === '' || away === '') return null;
  return `${home}-${away}`;
}

/** Calendar label in Mexico City — honest, never guesses "anoche". */
export function mexicoWhenLabel(iso: string, now = Date.now()): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return '';
    const day = mexicoDayKey(d);
    const today = mexicoDayKey(new Date(now));
    const [y, m, dd] = today.split('-').map(Number);
    const yest = new Date(Date.UTC(y!, m! - 1, dd!));
    yest.setUTCDate(yest.getUTCDate() - 1);
    const yesterday = yest.toISOString().slice(0, 10);

    if (day === today) {
      const t = d.toLocaleTimeString('es-MX', {
        timeZone: 'America/Mexico_City',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `hoy ${t}`;
    }
    if (day === yesterday) return 'ayer';
    return d.toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function buildTempo(
  jornada: JornadaOverview | null,
  now: number
): CableDossier['tempo'] {
  const mexicoNow = new Date(now).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
  const live = Boolean(jornada?.live?.length);
  const played = [...(jornada?.played ?? [])].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date)
  );
  const last = played[0] ?? null;
  const hoursSinceLastResult = last
    ? Math.max(0, Math.round((now - +new Date(last.date)) / 3600_000))
    : null;
  const lastResultLabel = last ? mexicoWhenLabel(last.date, now) : null;

  let framing: CableDossier['tempo']['framing'] = 'paused';
  if (live) framing = 'live';
  else if (last && isMexicoDay(last.date, mexicoDayKey(new Date(now)))) framing = 'today';
  else if (hoursSinceLastResult != null && hoursSinceLastResult <= 36) framing = 'recent';
  else framing = 'paused';

  const guidance =
    framing === 'live'
      ? 'Hay partido en vivo: puedes decir "en vivo" / el reloj. No digas anoche.'
      : framing === 'today'
        ? 'Hubo partidos hoy (hora MX): puedes decir "hoy". No digas anoche salvo que when diga ayer.'
        : framing === 'recent'
          ? `Último resultado: ${lastResultLabel}. Usa esa etiqueta o el nombre de la jornada. PROHIBIDO "anoche" / "esta mañana" si when no lo dice.`
          : `La Liga está en pausa o el último resultado fue hace ${hoursSinceLastResult ?? 'varios'} horas (${lastResultLabel ?? 'sin fecha'}). Di "en la ${jornada?.label ?? 'jornada'}" o la fecha explícita. PROHIBIDO "anoche", "hoy cerró", "esta noche".`;

  return {
    mexicoNow,
    mexicoDayKey: mexicoDayKey(new Date(now)),
    framing,
    lastResultLabel,
    hoursSinceLastResult,
    guidance,
  };
}

export function buildCableDossier(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle,
  extras: CableBriefExtras = {},
  now = Date.now()
): CableDossier {
  const picks = pickCableDisplayStories(stories, 4);
  return {
    generatedAt: new Date(now).toISOString(),
    style,
    tempo: buildTempo(jornada, now),
    cancha: {
      jornada: jornada?.label ?? null,
      live: (jornada?.live ?? []).map((f) => ({
        match: `${f.home.name} vs ${f.away.name}`,
        score: fixtureScore(f.home.score, f.away.score) ?? '0-0',
        clock: f.clock ?? null,
      })),
      results: (jornada?.played ?? []).slice(0, 8).map((f) => ({
        match: `${f.home.name} vs ${f.away.name}`,
        score: fixtureScore(f.home.score, f.away.score) ?? '—',
        when: mexicoWhenLabel(f.date, now),
        date: f.date,
      })),
      upcoming: (jornada?.upcoming ?? []).slice(0, 6).map((f) => ({
        match: `${f.home.name} vs ${f.away.name}`,
        when: mexicoWhenLabel(f.date, now),
        date: f.date,
      })),
      daySlate: extras.day ?? null,
    },
    tabla: extras.tabla ?? null,
    wire: picks.map((s, i) => ({
      slot: i === 0 ? ('lead' as const) : ('list' as const),
      index: i,
      id: s.id,
      source: s.sourceLabel,
      title: s.title,
      summary: (s.summary ?? '').slice(0, 280),
      accesoLine: s.accesoLine ?? '',
    })),
  };
}

/**
 * Offline fallback: spoken overview from dossier data — still not a headline parade.
 */
export function templateCableBriefFromDossier(dossier: CableDossier): ShowSegment[] {
  const { wire, style } = dossier;
  const chunks: ShowSegment[] = [];
  const lead = wire[0];
  const list = wire.slice(1, 4);

  chunks.push({
    id: 'brief-1',
    text: lead
      ? `Cable Acceso — arriba del feed, ${lead.source}: ${lead.summary || lead.title}${lead.accesoLine ? ` — Acceso: ${lead.accesoLine}` : ''}.`
      : 'Cable Acceso, el feed viene corto hoy.',
  });

  for (let i = 0; i < list.length; i++) {
    const s = list[i]!;
    const body =
      s.summary.length > 20
        ? `${s.source} también trae esto, ${s.summary}${s.accesoLine ? ` — Acceso: ${s.accesoLine}` : ''}`
        : `${s.source}: ${s.title}${s.accesoLine ? ` — Acceso: ${s.accesoLine}` : ''}`;
    chunks.push({
      id: `brief-${chunks.length + 1}`,
      text: body.endsWith('.') ? body : `${body}.`,
    });
  }

  chunks.push({
    id: `brief-${chunks.length + 1}`,
    text:
      style === 'puente'
        ? `Hasta aquí el cable de la pantalla — fuentes afuera si quieres más.`
        : `Eso es el cable de la pantalla, corto y al grano.`,
  });

  return chunks;
}

/** @deprecated Use templateCableBriefFromDossier — kept for callers/tests. */
export function templateCableBrief(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle,
  now = Date.now()
): ShowSegment[] {
  return templateCableBriefFromDossier(
    buildCableDossier(stories, jornada, style, {}, now)
  );
}

async function generateCableBriefFromDossier(
  dossier: CableDossier
): Promise<ShowSegment[] | null> {
  if (!anthropicEnabled()) return null;

  const style = dossier.style;
  const persona = PERSONAS[style];
  const voiceHint =
    style === 'caliente'
      ? 'Filo editorial, ritmo de cabina. Opinión corta solo cuando el dossier da pie.'
      : style === 'tactico'
        ? 'Lectura fría: prioridades de la fecha, incentivos de tabla, sin gritos.'
        : 'Binacional solo cuando el dato lo pide (dónde se vive / El Tri / US).';

  try {
    const raw = await anthropicChat({
      system: `${persona.system.replace(/Máximo 2 oraciones\./gi, 'Bloques hablados de overview.')}

Escribes el BRIEFING DEL CABLE de Acceso Futbol: un overview hablado CORTO (~2 min 30 s, máximo ~350 palabras en total).

INPUT = DOSSIER. Lo importante es dossier.wire (orden de pantalla: slot "lead" primero, luego "list"). cancha/tabla/tempo son contexto opcional — casi nunca los uses en este corte corto.

DURACIÓN: ~2:30. Máximo 4–5 bloques. Cubrir lead + las 3–4 notas de lista; no expandas cada nota a un monólogo.

ARCO OBLIGATORIO:
1) Abre con la nota lead (wire[0]) — sustancia + fuente, 2–3 oraciones orales juntas.
2–3) Dos o tres bloques más con el resto de wire EN ORDEN (puedes fusionar 2 notas hermanas). Cada bloque corto.
4) Cierre en una frase. SIN bloque de cancha/tabla salvo que haya live real en dossier.

PROHIBIDO abrir con jornada/tabla/resultados si hay wire. PROHIBIDO inventar notas. PROHIBIDO alargar para "llenar" los 5 minutos — este corte es corto.

TIEMPO (si mencionas cancha):
- Obedece dossier.tempo.guidance. NUNCA inventes "anoche" / "hoy cerró" si framing es paused.

REGLAS DURAS:
- PROHIBIDO leer solo el título en secuencia seca — da el ángulo con summary/accesoLine.
- PROHIBIDO "oye bienvenido", coche, cocina, scroll, sobremesa, siéntate, arrancamos, gracias por escucharnos.
- Español mexicano oral, seco, adulto.
- No inventes hechos fuera del dossier.

RITMO PARA TTS:
- Frases fluidas de 12–22 palabras; comas y rayas (—); máximo 1–2 puntos por bloque.
- Responde SOLO JSON: [{"id":"brief-1","text":"..."}, ...]`,
      user: JSON.stringify({
        kind: 'cable-brief-stories-on-screen',
        goal: 'Narrar el cable en ~2:30 — lead + top lista — no un show largo.',
        targetDuration: '2:30',
        maxWords: 350,
        voice: voiceHint,
        primary: 'wire',
        dossier,
      }),
      temperature: 0.55,
      maxTokens: 900,
    });
    if (!raw) return null;
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start < 0 || end < 0) return null;
    const parsed = JSON.parse(raw.slice(start, end + 1)) as ShowSegment[];
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    const cleaned = parsed
      .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 16)
      .map((s, i) => ({
        id: typeof s.id === 'string' ? s.id : `brief-${i + 1}`,
        text: s.text.trim(),
      }));
    return cleaned.length >= 3 ? cleaned : null;
  } catch {
    return null;
  }
}

export async function buildCableBriefSegments(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle,
  now = Date.now(),
  extras: CableBriefExtras = {}
): Promise<ShowSegment[]> {
  const dossier = buildCableDossier(stories, jornada, style, extras, now);
  const generated = await generateCableBriefFromDossier(dossier);
  return generated ?? templateCableBriefFromDossier(dossier);
}

/** Text-only beat — TTS is deferred to play via POST /api/radio/tts (Vercel-safe). */
function ensureBriefBeat(
  briefId: string,
  style: RadioStyle,
  seg: ShowSegment
): RadioBeat {
  const key = beatKey(briefId, seg.id, style);
  const existing = getBeat(key);
  if (existing?.text) return existing;

  const beat: RadioBeat = {
    id: key,
    matchId: briefId,
    style,
    text: seg.text,
    kind: 'show',
    createdAt: Date.now(),
  };
  setBeat(beat);
  pruneRadioCache();
  return beat;
}

export async function buildCableBriefFeed(
  stories: Story[],
  jornada: JornadaOverview | null,
  style: RadioStyle,
  now = new Date(),
  extras: CableBriefExtras = {}
): Promise<CableBriefPayload> {
  const id = cableBriefId(style, now.getTime());
  const enabled = radioEnabled();
  const picks = pickCableDisplayStories(stories, 4);
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
    const segments = await buildCableBriefSegments(
      stories,
      jornada,
      style,
      now.getTime(),
      extras
    );
    for (const seg of segments) {
      ensureBriefBeat(id, style, seg);
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
    // No audioPath — ephemeral /api/radio/audio URLs 404 across Vercel isolates.
    // Client synthesizes on play via POST /api/radio/tts.
    beats: beats.map((b) => ({
      id: b.id,
      text: b.text,
      kind: b.kind,
      createdAt: b.createdAt,
    })),
  };
}
