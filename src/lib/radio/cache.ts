import type { RadioStyle } from './personas';

export type RadioBeat = {
  id: string;
  matchId: string;
  style: RadioStyle;
  text: string;
  kind: 'peak' | 'color' | 'bed' | 'kick' | 'recap' | 'preshow' | 'show';
  createdAt: number;
  /** Path to stream audio if TTS succeeded */
  audioPath?: string;
};

type AudioEntry = { bytes: Buffer; contentType: string; ts: number };

const beats = new Map<string, RadioBeat>();
const audio = new Map<string, AudioEntry>();

export function beatKey(matchId: string, eventId: string, style: RadioStyle) {
  return `${matchId}:${eventId}:${style}`;
}

export function getBeat(key: string): RadioBeat | undefined {
  return beats.get(key);
}

export function setBeat(beat: RadioBeat) {
  beats.set(beat.id, beat);
}

export function listBeats(matchId: string, style: RadioStyle): RadioBeat[] {
  return [...beats.values()]
    .filter((b) => b.matchId === matchId && b.style === style)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function setAudio(key: string, bytes: Buffer, contentType = 'audio/mpeg') {
  audio.set(key, { bytes, contentType, ts: Date.now() });
}

export function getAudio(key: string): AudioEntry | undefined {
  return audio.get(key);
}

/** Cap memory on long-running instances */
export function pruneRadioCache(maxBeats = 400) {
  if (beats.size <= maxBeats) return;
  const ordered = [...beats.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  const drop = ordered.slice(0, ordered.length - maxBeats);
  for (const [k] of drop) {
    beats.delete(k);
    audio.delete(k);
  }
}
