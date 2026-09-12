import { NextResponse } from 'next/server';
import { buildNewsVideoPlan } from '@/lib/news/video/buildPlan';
import { getNewsVideoRecord } from '@/lib/news/video/store';

type Ctx = { params: Promise<{ id: string }> };

function originFrom(req: Request): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function GET(req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);
  try {
    const existing = await getNewsVideoRecord(id);
    if (existing?.plan) {
      return NextResponse.json(existing, { headers: { 'Cache-Control': 'no-store' } });
    }
    const rec = await buildNewsVideoPlan({
      episodeId: id,
      absoluteAudioOrigin: originFrom(req),
    });
    return NextResponse.json(rec, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: msg === 'episode_not_found' ? 404 : 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { id: raw } = await ctx.params;
  const id = decodeURIComponent(raw);
  let force = false;
  try {
    const body = (await req.json().catch(() => ({}))) as { force?: boolean };
    force = Boolean(body.force);
  } catch {
    /* ok */
  }
  try {
    const rec = await buildNewsVideoPlan({
      episodeId: id,
      force,
      absoluteAudioOrigin: originFrom(req),
    });
    return NextResponse.json(rec, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: msg === 'episode_not_found' ? 404 : 500 });
  }
}
