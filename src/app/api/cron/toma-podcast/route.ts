import { NextResponse } from 'next/server';
import type { TomaShowKind } from '@/lib/toma/episode';
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

function parseKind(raw: string | null): TomaShowKind | undefined {
  if (raw === 'antes' || raw === 'dia' || raw === 'cierre') return raw;
  return undefined;
}

/** Daily Vercel Cron (00:20 and 10:20 Mexico City). One show per tick: cierre → missing/latest settled day (incl. yesterday) → antes. Traffic on /api/toma also generates. `?force=1` is local only. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const kind = parseKind(url.searchParams.get('kind'));
  if (force) {
    if (!deskDev()) {
      return NextResponse.json({ error: 'force_local_only' }, { status: 403 });
    }
  } else if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { episode, skip } = await maybeGenerateTomaEpisode({ force, kind });
    return NextResponse.json({
      ok: true,
      generated: Boolean(episode?.audioUrl),
      id: episode?.id ?? null,
      audioUrl: episode?.audioUrl ?? null,
      kind: episode?.kind ?? kind ?? null,
      skip: skip ?? null,
      forced: force,
    });
  } catch {
    return NextResponse.json({ ok: false, generated: false }, { status: 502 });
  }
}
