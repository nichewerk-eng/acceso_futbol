import { get } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { briefBlobPath } from '@/lib/radio/briefEpisode';
import { parseNewsBriefId, recordingAudioHeaders, recordingFileName } from '@/lib/share/recordingShare';

export const maxDuration = 60;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const decoded = decodeURIComponent(id);
  if (!parseNewsBriefId(decoded)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const download = new URL(req.url).searchParams.get('download') === '1';
  const paths = [
    briefBlobPath(decoded, 'audio/mpeg'),
    briefBlobPath(decoded, 'audio/wav'),
  ];

  try {
    for (const blobPath of paths) {
      const result = await get(blobPath, { access: 'private' });
      if (result?.statusCode === 200 && result.stream) {
        const contentType = result.blob.contentType || 'audio/mpeg';
        return new NextResponse(result.stream, {
          headers: recordingAudioHeaders({
            contentType,
            fileName: recordingFileName('news', decoded, contentType),
            download,
          }),
        });
      }
    }
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
