/**
 * Local/dev render kick — spawns Remotion CLI. Not for Vercel serverless.
 * Production MP4s: `npm run render:toma -- <episodeId>` then upload, or Remotion Lambda later.
 */
import { spawn } from 'child_process';
import path from 'path';
import { NextResponse } from 'next/server';
import { buildTomaVideoPlan } from '@/lib/toma/video/buildPlan';
import { getVideoRecord, localVideoPath, putVideoRecord } from '@/lib/toma/video/store';

type Ctx = { params: Promise<{ id: string }> };

function originFrom(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request, ctx: Ctx) {
  if (process.env.NODE_ENV === 'production' && process.env.TOMA_RENDER_API !== 'true') {
    return NextResponse.json(
      {
        error: 'render_api_disabled',
        hint: 'Use npm run render:toma locally, or set TOMA_RENDER_API=true on a worker.',
      },
      { status: 403 }
    );
  }

  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);

  try {
    const rec = await buildTomaVideoPlan({
      episodeId: id,
      force: true,
      absoluteAudioOrigin: originFrom(req),
    });

    const out = localVideoPath(id);
    const propsPath = path.join(process.cwd(), '.toma-local', `${id}.props.json`);
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(path.dirname(propsPath), { recursive: true });
    await writeFile(propsPath, JSON.stringify({ plan: rec.plan }));

    const entry = path.join(process.cwd(), 'src/remotion/index.ts');
    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn(
        'npx',
        [
          'remotion',
          'render',
          entry,
          'TomaVideo',
          out,
          `--props=${propsPath}`,
          '--log=error',
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      let err = '';
      child.stderr?.on('data', (d) => {
        err += String(d);
      });
      child.on('error', reject);
      child.on('close', (c) => {
        if (c !== 0) reject(new Error(err.slice(0, 500) || `render_exit_${c}`));
        else resolve(c ?? 0);
      });
    });

    if (code !== 0) {
      return NextResponse.json({ error: 'render_failed' }, { status: 500 });
    }

    const updated = {
      ...rec,
      videoUrl: `/api/toma/video/${encodeURIComponent(id)}/file`,
      renderedAt: new Date().toISOString(),
      contentType: 'video/mp4',
    };
    await putVideoRecord(updated);
    const fresh = await getVideoRecord(id);
    return NextResponse.json(fresh ?? updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg.slice(0, 400) }, { status: 500 });
  }
}
