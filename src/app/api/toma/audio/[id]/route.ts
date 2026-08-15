import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { episodeBlobPath } from '@/lib/toma/episode';

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  if (!decoded.startsWith('toma-ep-')) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const paths = [
    episodeBlobPath(decoded, 'audio/wav'),
    episodeBlobPath(decoded, 'audio/mpeg'),
  ];

  try {
    for (const blobPath of paths) {
      const result = await get(blobPath, { access: 'private' });
      if (result?.statusCode === 200 && result.stream) {
        return new NextResponse(result.stream, {
          headers: {
            'Content-Type': result.blob.contentType || 'audio/wav',
            'Cache-Control': 'public, max-age=3600',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
