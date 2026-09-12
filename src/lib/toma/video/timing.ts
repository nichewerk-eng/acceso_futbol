import type { TomaAlignment, WordTiming } from './types';

export type CharAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

/** Collapse ElevenLabs character alignment into word timings. */
export function wordsFromCharAlignment(raw: CharAlignment): WordTiming[] {
  const chars = raw.characters ?? [];
  const starts = raw.character_start_times_seconds ?? [];
  const ends = raw.character_end_times_seconds ?? [];
  const words: WordTiming[] = [];
  let buf = '';
  let wStart = 0;
  let wEnd = 0;

  const flush = () => {
    const word = buf.trim();
    if (word) words.push({ word, start: wStart, end: Math.max(wEnd, wStart + 0.05) });
    buf = '';
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? '';
    const s = starts[i] ?? 0;
    const e = ends[i] ?? s;
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!buf) wStart = s;
    buf += ch;
    wEnd = e;
  }
  flush();
  return words;
}

/** Spread transcript words across duration when we lack real alignment. */
export function heuristicWordTimings(transcript: string, durationSeconds: number): WordTiming[] {
  const tokens = transcript.split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || durationSeconds <= 0) return [];
  const totalChars = tokens.reduce((n, w) => n + w.length, 0) || 1;
  let t = 0;
  return tokens.map((word) => {
    const share = word.length / totalChars;
    const dur = Math.max(0.08, share * durationSeconds);
    const start = t;
    const end = Math.min(durationSeconds, t + dur);
    t = end;
    return { word, start, end };
  });
}

export function durationFromAlignment(words: WordTiming[], fallback: number): number {
  if (words.length === 0) return fallback;
  return Math.max(fallback, words[words.length - 1]!.end + 0.4);
}

export function buildAlignment(
  raw: CharAlignment | null,
  transcript: string,
  fallbackDuration: number
): TomaAlignment {
  if (raw?.characters?.length) {
    const words = wordsFromCharAlignment(raw);
    const durationSeconds = durationFromAlignment(words, fallbackDuration);
    return {
      characters: raw.characters,
      characterStartTimesSeconds: raw.character_start_times_seconds,
      characterEndTimesSeconds: raw.character_end_times_seconds,
      words,
      durationSeconds,
    };
  }
  const words = heuristicWordTimings(transcript, fallbackDuration);
  return {
    characters: [],
    characterStartTimesSeconds: [],
    characterEndTimesSeconds: [],
    words,
    durationSeconds: fallbackDuration,
  };
}

/** Estimate spoken duration from Spanish TTS pacing (~2.3 words/sec). */
export function estimateSpokenSeconds(transcript: string): number {
  const words = transcript.split(/\s+/).filter(Boolean).length;
  return Math.max(12, Math.round(words / 2.3) + 2);
}
