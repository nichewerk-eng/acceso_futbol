import { PERSONAS, type RadioStyle } from './personas';
import { setAudio } from './cache';

export function radioEnabled(): boolean {
  return process.env.RADIO_ENABLED !== 'false';
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

export async function synthesize(
  key: string,
  text: string,
  style: RadioStyle
): Promise<string | undefined> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) return undefined;

  const voiceId =
    process.env[PERSONAS[style].voiceEnv]?.trim() ||
    process.env.ELEVENLABS_VOICE_DEFAULT?.trim();
  if (!voiceId) return undefined;

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
          // Slightly steadier delivery; punctuation still drives pauses
          voice_settings: {
            stability: 0.48,
            similarity_boost: 0.72,
          },
        }),
      }
    );
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    setAudio(key, buf, 'audio/mpeg');
    return `/api/radio/audio/${encodeURIComponent(key)}`;
  } catch {
    return undefined;
  }
}
