import { PERSONAS, type RadioStyle } from './personas';
import { setAudio } from './cache';

export function radioEnabled(): boolean {
  return process.env.RADIO_ENABLED !== 'false';
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
          text,
          model_id: model,
          voice_settings: { stability: 0.35, similarity_boost: 0.75 },
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
