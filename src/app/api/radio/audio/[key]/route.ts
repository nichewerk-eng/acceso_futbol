import { NextResponse } from 'next/server';
import { getAudio, getBeat } from '@/lib/radio/cache';
import { synthesize } from '@/lib/radio/tts';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decoded = decodeURIComponent(key);

  let entry = getAudio(decoded);
  if (!entry) {
    // Same-isolate recovery: beat text may still be in memory after a cold brief.
    const beat = getBeat(decoded);
    if (beat?.text) {
      await synthesize(decoded, beat.text, beat.style);
      entry = getAudio(decoded);
    }
  }

  if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(new Uint8Array(entry.bytes), {
    headers: {
      'Content-Type': entry.contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
