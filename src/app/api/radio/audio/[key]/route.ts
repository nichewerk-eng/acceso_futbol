import { NextResponse } from 'next/server';
import { getAudio, getBeat, setAudio } from '@/lib/radio/cache';
import { synthesize } from '@/lib/radio/tts';
import { loadLocalAudio } from '@/lib/toma/episode';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decoded = decodeURIComponent(key);

  let entry = getAudio(decoded);
  if (!entry && decoded.startsWith('toma-ep-')) {
    const disk = await loadLocalAudio(decoded);
    if (disk) {
      setAudio(decoded, disk.bytes, disk.contentType);
      entry = { bytes: disk.bytes, contentType: disk.contentType, ts: Date.now() };
    }
  }
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
      'Cache-Control':
        process.env.NODE_ENV === 'development'
          ? 'no-store'
          : 'public, max-age=3600',
    },
  });
}
