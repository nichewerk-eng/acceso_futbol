import { readFile, stat } from 'fs/promises';
import { NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getVideoRecord, localVideoPath } from '@/lib/toma/video/store';

type Ctx = { params: Promise<{ id: string }> };

function videoHeaders(opts: {
  contentType: string;
  download: boolean;
  fileName: string;
  length?: number;
}): Headers {
  const h = new Headers();
  h.set('Content-Type', opts.contentType);
  h.set('Cache-Control', 'private, max-age=60');
  if (opts.length != null) h.set('Content-Length', String(opts.length));
  if (opts.download) h.set('Content-Disposition', `attachment; filename="${opts.fileName}"`);
  return h;
}

export async function GET(req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);
  const download = new URL(req.url).searchParams.get('download') === '1';
  const fileName = `${id}.mp4`;

  try {
    const local = localVideoPath(id);
    const st = await stat(local).catch(() => null);
    if (st?.isFile() && st.size > 0) {
      const bytes = await readFile(local);
      return new NextResponse(bytes, {
        headers: videoHeaders({
          contentType: 'video/mp4',
          download,
          fileName,
          length: bytes.length,
        }),
      });
    }
  } catch {
    /* try blob */
  }

  const rec = await getVideoRecord(id);
  if (rec?.blobPath) {
    try {
      const result = await get(rec.blobPath, { access: 'private' });
      if (result?.statusCode === 200 && result.stream) {
        return new NextResponse(result.stream, {
          headers: videoHeaders({
            contentType: rec.contentType || result.blob.contentType || 'video/mp4',
            download,
            fileName,
          }),
        });
      }
    } catch {
      /* fall through */
    }
  }

  return NextResponse.json(
    {
      error: 'video_not_rendered',
      hint: 'Run: npm run render:toma -- ' + id,
    },
    { status: 404 }
  );
}
