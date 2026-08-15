import { NextResponse } from 'next/server';
import { maybeGenerateTomaEpisode } from '@/lib/toma/generateEpisode';

export const maxDuration = 120;

function bearerOk(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

function authorized(req: Request): boolean {
  if (bearerOk(req)) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

function deskDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** Vercel Cron GET. No-ops unless today's slate is closed. `?force=1` is local only. */
export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.get('force') === '1';
  if (force) {
    if (!deskDev()) {
      return NextResponse.json({ error: 'force_local_only' }, { status: 403 });
    }
  } else if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { episode, skip } = await maybeGenerateTomaEpisode({ force });
    return NextResponse.json({
      ok: true,
      generated: Boolean(episode?.audioUrl),
      id: episode?.id ?? null,
      audioUrl: episode?.audioUrl ?? null,
      skip: skip ?? null,
      forced: force,
    });
  } catch {
    return NextResponse.json({ ok: false, generated: false }, { status: 502 });
  }
}
