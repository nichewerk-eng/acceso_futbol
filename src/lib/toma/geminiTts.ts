import { pcm16ToWav, sampleRateFromMime } from '@/lib/toma/wav';

export function geminiTtsEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Bump when voices or delivery prompt change so stored episodes regenerate. */
export const TOMA_VOICE_REV = 'v4-fenrir-enceladus';

function ttsModel(): string {
  return process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-2.5-flash-preview-tts';
}

type GeminiPart = {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
};

function partAudio(part: GeminiPart | undefined): { mime: string; b64: string } | null {
  if (!part) return null;
  const camel = part.inlineData;
  const snake = part.inline_data;
  const mime = camel?.mimeType ?? snake?.mime_type ?? '';
  const b64 = camel?.data ?? snake?.data;
  if (!b64) return null;
  return { mime, b64 };
}

/** Two-host PCM/WAV from Gemini TTS. */
export async function synthesizeTwoHost(transcript: string): Promise<{
  bytes: Buffer;
  contentType: string;
} | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const spoken = `TTS the following conversation between Alex and Mar.

Mexican Spanish from Mexico (CDMX). Liga MX TV truck, not a studio podcast. Worn, a little hoarse, raspy around the edges. Twenty years on the mic. Less diction, more street. Bite, smile, stretch a word, let the voice crack a little.

Alex: lead relator, baritone, rough. Mar: Mexican too, breathy, not polished, hits the number then the question.

Say "Liga MX" as "Liga eme equis". Never clean. Never bright. Never Spain. Never Argentine. Never a US podcast host.

${transcript}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(ttsModel())}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: spoken }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            languageCode: 'es-MX',
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: 'Alex',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
                },
                {
                  speaker: 'Mar',
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Enceladus' } },
                },
              ],
            },
          },
        },
      }),
    });
    if (!res.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('gemini tts', res.status, await res.text().catch(() => ''));
      }
      return null;
    }
    const json = (await res.json()) as GeminiResponse;
    const audio = partAudio(json.candidates?.[0]?.content?.parts?.[0]);
    if (!audio) return null;
    const pcm = Buffer.from(audio.b64, 'base64');
    if (/wav/i.test(audio.mime) || /mpeg|mp3/i.test(audio.mime)) {
      return { bytes: pcm, contentType: /mp3|mpeg/i.test(audio.mime) ? 'audio/mpeg' : 'audio/wav' };
    }
    const wav = pcm16ToWav(pcm, sampleRateFromMime(audio.mime));
    return { bytes: wav, contentType: 'audio/wav' };
  } catch {
    return null;
  }
}
