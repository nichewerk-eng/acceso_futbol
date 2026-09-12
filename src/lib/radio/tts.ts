import { PERSONAS, type RadioStyle } from './personas';
import { setAudio } from './cache';

export function radioEnabled(): boolean {
  return process.env.RADIO_ENABLED !== 'false';
}

/** Per-request ElevenLabs (briefing play / live cabina). Off so cron MP3s fit Starter. */
export function liveTtsEnabled(): boolean {
  return process.env.LIVE_TTS === 'true';
}

function wordCount(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

function stripTerminalPunct(s: string) {
  return s.replace(/[.!?…]+$/u, '').trim();
}

/**
 * Soften copy for ElevenLabs — stacked periods create long robotic pauses.
 * Merges short sentences into flowing clauses with commas / em-dashes.
 */
export function prepareForTts(text: string): string {
  let t = text
    .replace(/\u00a0/g, ' ')
    .replace(/\bLiga\s*MX\b/gi, 'Liga eme equis')
    .replace(/\s+/g, ' ')
    .replace(/\.{3,}/g, '…')
    .replace(/\s*;\s*/g, ', ')
    .trim();
  if (!t) return t;

  const parts = t.split(/(?<=[.!?…])\s+/u).map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return /[.!?…]$/u.test(t) ? t : `${t}.`;
  }

  const out: string[] = [];
  let buf = stripTerminalPunct(parts[0]!);

  for (let i = 1; i < parts.length; i++) {
    const raw = parts[i]!;
    const wasQuestion = /[?]$/u.test(raw);
    const wasExclaim = /[!]$/u.test(raw);
    const cur = stripTerminalPunct(raw);
    if (!cur) continue;

    if (!buf) {
      buf = cur;
      if (wasQuestion) {
        out.push(`${buf}?`);
        buf = '';
      } else if (wasExclaim) {
        out.push(`${buf}!`);
        buf = '';
      }
      continue;
    }

    const shortBuf = wordCount(buf) <= 11;
    const shortCur = wordCount(cur) <= 9;

    if (shortBuf || shortCur) {
      buf = `${buf}, ${cur}`;
      if (wasQuestion) {
        out.push(`${buf}?`);
        buf = '';
      } else if (wasExclaim) {
        out.push(`${buf}!`);
        buf = '';
      }
      continue;
    }

    out.push(`${buf}.`);
    buf = cur;
    if (wasQuestion) {
      out.push(`${buf}?`);
      buf = '';
    } else if (wasExclaim) {
      out.push(`${buf}!`);
      buf = '';
    }
  }

  if (buf) out.push(/[.!?…]$/u.test(buf) ? buf : `${buf}.`);
  return out
    .join(' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when ElevenLabs is usable for a style (API key + a resolvable voice id). */
export function elevenLabsConfigured(style: RadioStyle = 'caliente'): boolean {
  if (!process.env.ELEVENLABS_API_KEY?.trim()) return false;
  return Boolean(
    process.env[PERSONAS[style].voiceEnv]?.trim() ||
      process.env.ELEVENLABS_VOICE_DEFAULT?.trim()
  );
}

export type TtsAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type SynthesizeResult = {
  bytes: Buffer;
  contentType: string;
  alignment?: TtsAlignment;
};

function voiceSettings() {
  return {
    stability: 0.48,
    similarity_boost: 0.72,
  };
}

/** Raw ElevenLabs MP3 for one voice. Shared by the radio cache and Toma episodes. */
export async function synthesizeBytes(
  text: string,
  style: RadioStyle = 'caliente'
): Promise<SynthesizeResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const voiceId =
    process.env[PERSONAS[style].voiceEnv]?.trim() ||
    process.env.ELEVENLABS_VOICE_DEFAULT?.trim();
  if (!voiceId) return null;

  const model = process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5';
  const spoken = prepareForTts(text);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text: spoken,
          model_id: model,
          voice_settings: voiceSettings(),
        }),
      }
    );
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240);
      console.error('elevenlabs_tts', res.status, detail);
      return null;
    }
    return { bytes: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg' };
  } catch (err) {
    console.error('elevenlabs_tts', err instanceof Error ? err.message : 'fetch');
    return null;
  }
}

/**
 * ElevenLabs with-timestamps — character-level clock for captions + scene sync.
 * Falls back to plain synthesizeBytes when the endpoint fails.
 */
export async function synthesizeBytesWithTimestamps(
  text: string,
  style: RadioStyle = 'caliente'
): Promise<SynthesizeResult | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return null;

  const voiceId =
    process.env[PERSONAS[style].voiceEnv]?.trim() ||
    process.env.ELEVENLABS_VOICE_DEFAULT?.trim();
  if (!voiceId) return null;

  const model = process.env.ELEVENLABS_MODEL ?? 'eleven_flash_v2_5';
  const spoken = prepareForTts(text);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          text: spoken,
          model_id: model,
          voice_settings: voiceSettings(),
        }),
      }
    );
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 240);
      console.error('elevenlabs_tts_timestamps', res.status, detail);
      return null;
    }
    const json = (await res.json()) as {
      audio_base64?: string;
      alignment?: TtsAlignment;
      normalized_alignment?: TtsAlignment;
    };
    if (!json.audio_base64) return null;
    const alignment = json.normalized_alignment ?? json.alignment;
    return {
      bytes: Buffer.from(json.audio_base64, 'base64'),
      contentType: 'audio/mpeg',
      alignment: alignment?.characters?.length ? alignment : undefined,
    };
  } catch (err) {
    console.error(
      'elevenlabs_tts_timestamps',
      err instanceof Error ? err.message : 'fetch'
    );
    return null;
  }
}

export async function synthesize(
  key: string,
  text: string,
  style: RadioStyle
): Promise<string | undefined> {
  const out = await synthesizeBytes(text, style);
  if (!out) return undefined;
  setAudio(key, out.bytes, out.contentType);
  return `/api/radio/audio/${encodeURIComponent(key)}`;
}
