import { NextResponse } from 'next/server';
import { maybeGenerateTomaEpisode } from '@/lib/toma/generateEpisode';

export const maxDuration = 120;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

/** Vercel Cron GET. No-ops unless today's slate is closed. */
export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const episode = await maybeGenerateTomaEpisode();
    return NextResponse.json({
      ok: true,
      generated: Boolean(episode?.audioUrl),
      id: episode?.id ?? null,
    });
  } catch {
    return NextResponse.json({ ok: false, generated: false }, { status: 502 });
  }
}
