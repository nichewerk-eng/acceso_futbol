import { NextResponse } from 'next/server';
import { getAudio } from '@/lib/radio/cache';
import { isRadioStyle, type RadioStyle } from '@/lib/radio/personas';
import { liveTtsEnabled, synthesize } from '@/lib/radio/tts';

type TtsBody = {
  key?: string;
  text?: string;
  style?: string;
};

/**
 * On-demand ElevenLabs TTS. Audio lives in process memory and is lost across
 * Vercel isolates — so the client posts text+key at play time instead of
 * relying on ephemeral /api/radio/audio URLs from a prior cold build.
 */
export async function POST(req: Request) {
  let body: TtsBody;
  try {
    body = (await req.json()) as TtsBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const key = typeof body.key === 'string' ? body.key.trim() : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const styleRaw = typeof body.style === 'string' ? body.style : '';
  if (!key || !text || !isRadioStyle(styleRaw)) {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const style = styleRaw as RadioStyle;

  const hit = getAudio(key);
  if (hit) {
    return new NextResponse(new Uint8Array(hit.bytes), {
      headers: {
        'Content-Type': hit.contentType,
        'Cache-Control': 'private, max-age=3600',
        'X-AF-TTS': 'memory',
      },
    });
  }

  if (!liveTtsEnabled()) {
    return NextResponse.json({ error: 'scheduled_voice_only' }, { status: 503 });
  }

  const path = await synthesize(key, text, style);
  const entry = getAudio(key);
  if (!path || !entry) {
    return NextResponse.json({ error: 'tts_unavailable' }, { status: 503 });
  }

  return new NextResponse(new Uint8Array(entry.bytes), {
    headers: {
      'Content-Type': entry.contentType,
      'Cache-Control': 'private, max-age=3600',
      'X-AF-TTS': 'fresh',
    },
  });
}
