import { NextResponse } from 'next/server';
import { getAudio } from '@/lib/radio/cache';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decoded = decodeURIComponent(key);
  const entry = getAudio(decoded);
  if (!entry) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(new Uint8Array(entry.bytes), {
    headers: {
      'Content-Type': entry.contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
