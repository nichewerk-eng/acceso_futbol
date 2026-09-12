import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { clubRef } from './clubAssets';
import { j8HandPlan, J8_EPISODE_ID } from './plans/j8-2026-09-11';
import { estimateSpokenSeconds } from './timing';
import type {
  ClubRef,
  TomaScene,
  TomaVideoPlan,
  WordTiming,
} from './types';
import {
  TOMA_VIDEO_FPS,
  TOMA_VIDEO_HEIGHT,
  TOMA_VIDEO_WIDTH,
} from './types';

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  return JSON.parse(raw);
}

function resolveClub(idOrName: string): ClubRef {
  const key = idOrName
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '-');
  const aliases: Record<string, string> = {
    america: 'america',
    'club-america': 'america',
    guadalajara: 'chivas',
    chivas: 'chivas',
    'tigres-uanl': 'tigres',
    tigres: 'tigres',
    'pumas-unam': 'pumas',
    pumas: 'pumas',
    'cruz-azul': 'cruz-azul',
    monterrey: 'monterrey',
    toluca: 'toluca',
    atlas: 'atlas',
    pachuca: 'pachuca',
    puebla: 'puebla',
    necaxa: 'necaxa',
    atlante: 'atlante',
    queretaro: 'queretaro',
    tijuana: 'tijuana',
  };
  const id = aliases[key] ?? aliases[key.split('-')[0]!] ?? key;
  return clubRef(id);
}

type RawScene = {
  type: string;
  start: number;
  end: number;
  [key: string]: unknown;
};

function normalizeScene(raw: RawScene): TomaScene | null {
  const start = Number(raw.start);
  const end = Number(raw.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  switch (raw.type) {
    case 'intro':
      return {
        type: 'intro',
        start,
        end,
        kicker: String(raw.kicker ?? 'AF://TOMA'),
        title: String(raw.title ?? 'LA TOMA'),
        subtitle: raw.subtitle ? String(raw.subtitle) : undefined,
      };
    case 'teamSpotlight': {
      const team = resolveClub(String(raw.teamId ?? raw.team ?? 'america'));
      const stats = Array.isArray(raw.stats)
        ? (raw.stats as { label: string; value: string }[])
        : [];
      return {
        type: 'teamSpotlight',
        start,
        end,
        team,
        headline: String(raw.headline ?? team.name),
        stats: stats.slice(0, 4),
      };
    }
    case 'results': {
      const matches = Array.isArray(raw.matches)
        ? (raw.matches as {
            home: string;
            away: string;
            homeScore: number;
            awayScore: number;
          }[]).map((m) => ({
            home: resolveClub(m.home),
            away: resolveClub(m.away),
            homeScore: Number(m.homeScore) || 0,
            awayScore: Number(m.awayScore) || 0,
          }))
        : [];
      if (matches.length === 0) return null;
      return {
        type: 'results',
        start,
        end,
        headline: raw.headline ? String(raw.headline) : undefined,
        matches,
      };
    }
    case 'matchCard':
      return {
        type: 'matchCard',
        start,
        end,
        home: resolveClub(String(raw.home)),
        away: resolveClub(String(raw.away)),
        when: String(raw.when ?? ''),
        label: raw.label ? String(raw.label) : undefined,
      };
    case 'standings': {
      const rows = Array.isArray(raw.rows)
        ? (raw.rows as { rank: number; team: string; pts: number; highlight?: boolean }[]).map(
            (r) => ({
              rank: Number(r.rank),
              team: resolveClub(r.team),
              pts: Number(r.pts) || 0,
              highlight: Boolean(r.highlight),
            })
          )
        : [];
      if (rows.length === 0) return null;
      return {
        type: 'standings',
        start,
        end,
        headline: raw.headline ? String(raw.headline) : undefined,
        rows,
      };
    }
    case 'quote':
      return {
        type: 'quote',
        start,
        end,
        text: String(raw.text ?? ''),
        emphasis: Array.isArray(raw.emphasis) ? (raw.emphasis as string[]) : undefined,
      };
    case 'outro':
      return {
        type: 'outro',
        start,
        end,
        line: raw.line ? String(raw.line) : undefined,
      };
    case 'headline':
      return {
        type: 'headline',
        start,
        end,
        kicker: raw.kicker ? String(raw.kicker) : undefined,
        text: String(raw.text ?? ''),
      };
    default:
      return null;
  }
}

function snapScenesToWords(scenes: TomaScene[], words: WordTiming[], duration: number): TomaScene[] {
  if (words.length === 0) {
    return scenes.map((s) => ({
      ...s,
      start: Math.max(0, s.start),
      end: Math.min(duration, s.end),
    }));
  }
  return scenes.map((s) => ({
    ...s,
    start: Math.max(0, Math.min(s.start, duration - 0.5)),
    end: Math.max(s.start + 0.8, Math.min(s.end, duration)),
  }));
}

export async function planScenesWithAi(input: {
  transcript: string;
  durationSeconds: number;
  words: WordTiming[];
  title: string;
  jornadaNum: number;
  fixtureHint?: string;
}): Promise<TomaScene[] | null> {
  if (!anthropicEnabled()) return null;

  const wordHints = input.words
    .filter((_, i) => i % 8 === 0)
    .slice(0, 40)
    .map((w) => `${w.start.toFixed(1)}s:${w.word}`)
    .join(' | ');

  const text = await anthropicChat({
    system: `Eres el editor de video de Acceso Futbol para La Toma (9:16).
Devuelves SOLO JSON: { "scenes": [ ... ] }.
Tipos permitidos: intro, teamSpotlight, results, matchCard, standings, quote, outro, headline.
Cada escena: start/end en segundos (0..duration). Sin huecos largos (>3s). Sin solapes.
Usa club ids: america, chivas, tigres, pumas, cruz-azul, monterrey, toluca, atlas, pachuca, puebla, necaxa, atlante, queretaro, tijuana, santos, leon, san-luis, juarez.
Alterna fotografía tipográfica / data: no hagas solo fotos.
Cierra con quote (pregunta que divide) + outro.
VO/graphics: sin acentos en títulos cortos si quieres; el texto de quote puede llevar acentos.`,
    user: `Duración: ${input.durationSeconds}s
Título: ${input.title}
Jornada: ${input.jornadaNum}
Hints de tiempo: ${wordHints}
Fixtures/contexto:
${input.fixtureHint ?? '(sin fixture extra)'}

Transcripción:
${input.transcript}

Responde JSON con scenes.`,
    maxTokens: 2500,
    temperature: 0.35,
  });
  if (!text) return null;

  try {
    const parsed = extractJson(text) as { scenes?: RawScene[] };
    const scenes = (parsed.scenes ?? [])
      .map(normalizeScene)
      .filter((s): s is TomaScene => Boolean(s));
    if (scenes.length < 3) return null;
    return snapScenesToWords(scenes, input.words, input.durationSeconds);
  } catch {
    return null;
  }
}

export function buildPlanFromParts(input: {
  episodeId: string;
  jornadaNum: number;
  dayKey: string;
  title: string;
  transcript: string;
  audioUrl: string;
  audioSrc: string;
  words: WordTiming[];
  durationSeconds: number;
  scenes: TomaScene[];
  source: TomaVideoPlan['source'];
}): TomaVideoPlan {
  return {
    version: 1,
    episodeId: input.episodeId,
    jornadaNum: input.jornadaNum,
    dayKey: input.dayKey,
    title: input.title,
    format: '9:16',
    fps: TOMA_VIDEO_FPS,
    width: TOMA_VIDEO_WIDTH,
    height: TOMA_VIDEO_HEIGHT,
    durationSeconds: input.durationSeconds || estimateSpokenSeconds(input.transcript),
    audioUrl: input.audioUrl,
    audioSrc: input.audioSrc,
    transcript: input.transcript,
    words: input.words,
    scenes: input.scenes,
    generatedAt: new Date().toISOString(),
    source: input.source,
  };
}

/** Prefer hand plan for the seed episode; otherwise AI or empty. */
export async function resolveVideoPlan(input: {
  episodeId: string;
  jornadaNum: number;
  dayKey: string;
  title: string;
  transcript: string;
  audioUrl: string;
  audioSrc: string;
  words: WordTiming[];
  durationSeconds: number;
  fixtureHint?: string;
  preferHand?: boolean;
}): Promise<TomaVideoPlan> {
  if (input.preferHand !== false && input.episodeId === J8_EPISODE_ID) {
    const hand = j8HandPlan(input.audioSrc);
    return {
      ...hand,
      audioUrl: input.audioUrl,
      audioSrc: input.audioSrc,
      words: input.words.length ? input.words : hand.words,
      durationSeconds: input.durationSeconds || hand.durationSeconds,
      transcript: input.transcript || hand.transcript,
      generatedAt: new Date().toISOString(),
    };
  }

  const aiScenes = await planScenesWithAi({
    transcript: input.transcript,
    durationSeconds: input.durationSeconds,
    words: input.words,
    title: input.title,
    jornadaNum: input.jornadaNum,
    fixtureHint: input.fixtureHint,
  });

  if (aiScenes) {
    return buildPlanFromParts({
      ...input,
      scenes: aiScenes,
      source: 'ai',
    });
  }

  // Minimal fallback timeline
  const d = input.durationSeconds;
  const scenes: TomaScene[] = [
    {
      type: 'intro',
      start: 0,
      end: Math.min(6, d * 0.08),
      title: `JORNADA ${input.jornadaNum}`,
      subtitle: input.title,
    },
    {
      type: 'headline',
      start: Math.min(6, d * 0.08),
      end: Math.max(d - 10, d * 0.7),
      text: input.title,
    },
    {
      type: 'quote',
      start: Math.max(d - 10, d * 0.7),
      end: Math.max(d - 4, d * 0.9),
      text: input.transcript.slice(-180),
    },
    {
      type: 'outro',
      start: Math.max(d - 4, d * 0.9),
      end: d,
    },
  ];
  return buildPlanFromParts({ ...input, scenes, source: 'heuristic' });
}
