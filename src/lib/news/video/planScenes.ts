import { NEWS_OUTRO } from '@/lib/radio/signOff';
import {
  buildAlignment,
  estimateSpokenSeconds,
  heuristicWordTimings,
} from '@/lib/toma/video/timing';
import type { WordTiming } from '@/lib/toma/video/types';
import { anthropicChat, anthropicEnabled } from '@/lib/ai/anthropic';
import { clubFromText } from './storyAssets';
import type { NewsScene, NewsStoryBeat, NewsVideoPlan } from './types';
import { NEWS_VIDEO_FPS, NEWS_VIDEO_HEIGHT, NEWS_VIDEO_WIDTH } from './types';

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse((fenced?.[1] ?? text).trim());
}

/** Spread story cards across the middle of the brief; intro/outro bookends. */
export function heuristicNewsScenes(input: {
  title: string;
  stories: NewsStoryBeat[];
  durationSeconds: number;
  transcript: string;
}): NewsScene[] {
  const d = input.durationSeconds;
  const introEnd = Math.min(6, d * 0.08);
  const outroStart = Math.max(d - 8, d * 0.88);
  const bodyStart = introEnd;
  const bodyEnd = outroStart;
  const stories = input.stories.length
    ? input.stories
    : [{ title: input.title, sourceLabel: 'Acceso', summary: input.transcript.slice(0, 120) }];

  const scenes: NewsScene[] = [
    {
      type: 'intro',
      start: 0,
      end: introEnd,
      title: input.title.toUpperCase(),
      subtitle: 'AF://NEWS',
    },
  ];

  const span = Math.max(1, bodyEnd - bodyStart);
  const each = span / stories.length;
  stories.forEach((s, i) => {
    const start = bodyStart + i * each;
    const end = i === stories.length - 1 ? bodyEnd : bodyStart + (i + 1) * each;
    scenes.push({
      type: 'story',
      start,
      end: Math.max(start + 1.2, end - (s.accesoLine ? each * 0.28 : 0)),
      index: i + 1,
      title: s.title,
      sourceLabel: s.sourceLabel,
      line: s.summary || s.accesoLine,
      team: s.team,
    });
    if (s.accesoLine && each > 4) {
      scenes.push({
        type: 'take',
        start: Math.max(start + each * 0.72, end - each * 0.28),
        end,
        text: s.accesoLine,
      });
    }
  });

  scenes.push({
    type: 'outro',
    start: outroStart,
    end: d,
    line: NEWS_OUTRO,
  });
  return scenes;
}

export async function planNewsScenesWithAi(input: {
  transcript: string;
  durationSeconds: number;
  words: WordTiming[];
  title: string;
  stories: NewsStoryBeat[];
}): Promise<NewsScene[] | null> {
  if (!anthropicEnabled()) return null;
  const storyPack = input.stories
    .map((s, i) => `${i + 1}. [${s.sourceLabel}] ${s.title}${s.accesoLine ? ` — ${s.accesoLine}` : ''}`)
    .join('\n');

  const text = await anthropicChat({
    system: `Eres el editor de video de Acceso Futbol para AF://NEWS (9:16).
Devuelves SOLO JSON: { "scenes": [ ... ] }.
Tipos: intro, story, take, headline, outro.
Cada escena: start/end en segundos (0..duration). Sin huecos largos. Sin solapes graves.
story: { type, start, end, index, title, sourceLabel, line?, teamId? }
take: ángulo Acceso en tipografía grande.
Cierra con outro. Primera escena intro con el título del briefing.`,
    user: `Duración: ${input.durationSeconds}s
Título: ${input.title}
Notas:
${storyPack || '(sin notas estructuradas)'}

Transcripción:
${input.transcript}

JSON:`,
    maxTokens: 2000,
    temperature: 0.35,
  });
  if (!text) return null;

  try {
    const parsed = extractJson(text) as {
      scenes?: {
        type: string;
        start: number;
        end: number;
        index?: number;
        title?: string;
        sourceLabel?: string;
        line?: string;
        text?: string;
        teamId?: string;
        kicker?: string;
        emphasis?: string[];
      }[];
    };
    const scenes: NewsScene[] = [];
    for (const raw of parsed.scenes ?? []) {
      const start = Number(raw.start);
      const end = Number(raw.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      if (raw.type === 'intro') {
        scenes.push({
          type: 'intro',
          start,
          end,
          title: String(raw.title ?? input.title),
          subtitle: raw.kicker ? String(raw.kicker) : undefined,
        });
      } else if (raw.type === 'story') {
        const team = raw.teamId
          ? clubFromText(raw.teamId)
          : clubFromText(`${raw.title ?? ''} ${raw.line ?? ''}`);
        scenes.push({
          type: 'story',
          start,
          end,
          index: Number(raw.index) || scenes.filter((s) => s.type === 'story').length + 1,
          title: String(raw.title ?? ''),
          sourceLabel: String(raw.sourceLabel ?? 'Acceso'),
          line: raw.line ? String(raw.line) : undefined,
          team,
        });
      } else if (raw.type === 'take') {
        scenes.push({
          type: 'take',
          start,
          end,
          text: String(raw.text ?? ''),
          emphasis: raw.emphasis,
        });
      } else if (raw.type === 'headline') {
        scenes.push({
          type: 'headline',
          start,
          end,
          kicker: raw.kicker ? String(raw.kicker) : undefined,
          text: String(raw.text ?? ''),
        });
      } else if (raw.type === 'outro') {
        scenes.push({
          type: 'outro',
          start,
          end,
          line: raw.text ? String(raw.text) : NEWS_OUTRO,
        });
      }
    }
    return scenes.length >= 3 ? scenes : null;
  } catch {
    return null;
  }
}

export async function resolveNewsVideoPlan(input: {
  episodeId: string;
  dayKey: string;
  slot: 'am' | 'pm';
  title: string;
  transcript: string;
  audioUrl: string;
  audioSrc: string;
  words: WordTiming[];
  durationSeconds: number;
  stories: NewsStoryBeat[];
}): Promise<NewsVideoPlan> {
  const duration =
    input.durationSeconds ||
    estimateSpokenSeconds(input.transcript) ||
    90;
  const words =
    input.words.length > 0 ? input.words : heuristicWordTimings(input.transcript, duration);

  const ai = await planNewsScenesWithAi({
    transcript: input.transcript,
    durationSeconds: duration,
    words,
    title: input.title,
    stories: input.stories,
  });

  const scenes =
    ai ??
    heuristicNewsScenes({
      title: input.title,
      stories: input.stories,
      durationSeconds: duration,
      transcript: input.transcript,
    });

  return {
    version: 1,
    episodeId: input.episodeId,
    dayKey: input.dayKey,
    slot: input.slot,
    title: input.title,
    format: '9:16',
    fps: NEWS_VIDEO_FPS,
    width: NEWS_VIDEO_WIDTH,
    height: NEWS_VIDEO_HEIGHT,
    durationSeconds: duration,
    audioUrl: input.audioUrl,
    audioSrc: input.audioSrc,
    transcript: input.transcript,
    words,
    stories: input.stories,
    scenes,
    generatedAt: new Date().toISOString(),
    source: ai ? 'ai' : 'heuristic',
  };
}

export function sampleNewsPlan(audioSrc?: string): NewsVideoPlan {
  const stories: NewsStoryBeat[] = [
    {
      title: 'América sigue arriba y la Liga MX no perdona',
      sourceLabel: 'Acceso',
      summary: 'Dieciséis puntos y colchón cómodo en la cima.',
      accesoLine: '¿Ya se escaparon, o todavía hay cacería?',
      team: clubFromText('América'),
    },
    {
      title: 'Clásico Regio bajo presión',
      sourceLabel: 'ESPN',
      summary: 'Monterrey y Tigres no pueden tropezar.',
      team: clubFromText('Monterrey Tigres'),
    },
    {
      title: 'La tabla se aprieta en el corte del 8',
      sourceLabel: 'MedioTiempo',
      summary: 'Cruz Azul sostiene; Pachuca acecha.',
      team: clubFromText('Cruz Azul'),
    },
  ];
  const transcript = [
    'Briefing de la mañana.',
    stories.map((s) => `${s.title}. ${s.summary}`).join(' '),
    NEWS_OUTRO,
  ].join(' ');
  const duration = 75;
  return {
    version: 1,
    episodeId: 'news-brief-sample',
    dayKey: '2026-09-12',
    slot: 'am',
    title: 'Briefing de la mañana',
    format: '9:16',
    fps: NEWS_VIDEO_FPS,
    width: NEWS_VIDEO_WIDTH,
    height: NEWS_VIDEO_HEIGHT,
    durationSeconds: duration,
    audioUrl: '/api/radio/brief-audio/news-brief-sample',
    audioSrc: audioSrc ?? '/api/radio/brief-audio/news-brief-sample',
    transcript,
    words: heuristicWordTimings(transcript, duration),
    stories,
    scenes: heuristicNewsScenes({
      title: 'Briefing de la mañana',
      stories,
      durationSeconds: duration,
      transcript,
    }),
    generatedAt: new Date().toISOString(),
    source: 'hand',
  };
}

export { buildAlignment, estimateSpokenSeconds, heuristicWordTimings };
