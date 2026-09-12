import { spawn } from 'child_process';
import path from 'path';
import { NextResponse } from 'next/server';
import { buildNewsVideoPlan } from '@/lib/news/video/buildPlan';
import {
  getNewsVideoRecord,
  localNewsVideoPath,
  putNewsVideoRecord,
} from '@/lib/news/video/store';

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
        hint: 'Use npm run render:news locally, or set TOMA_RENDER_API=true on a worker.',
      },
      { status: 403 }
    );
  }

  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);

  try {
    const rec = await buildNewsVideoPlan({
      episodeId: id,
      force: true,
      absoluteAudioOrigin: originFrom(req),
    });

    const out = localNewsVideoPath(id);
    const propsPath = path.join(process.cwd(), '.toma-local', `${id}.props.json`);
    const { writeFile, mkdir } = await import('fs/promises');
    await mkdir(path.dirname(propsPath), { recursive: true });
    await writeFile(propsPath, JSON.stringify({ plan: rec.plan }));

    const entry = path.join(process.cwd(), 'src/remotion/index.ts');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'npx',
        ['remotion', 'render', entry, 'NewsVideo', out, `--props=${propsPath}`, '--log=error'],
        { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      let err = '';
      child.stderr?.on('data', (d) => {
        err += String(d);
      });
      child.on('error', reject);
      child.on('close', (c) => {
        if (c !== 0) reject(new Error(err.slice(0, 500) || `render_exit_${c}`));
        else resolve();
      });
    });

    const updated = {
      ...rec,
      videoUrl: `/api/news/video/${encodeURIComponent(id)}/file`,
      renderedAt: new Date().toISOString(),
      contentType: 'video/mp4',
    };
    await putNewsVideoRecord(updated);
    return NextResponse.json((await getNewsVideoRecord(id)) ?? updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg.slice(0, 400) }, { status: 500 });
  }
}
