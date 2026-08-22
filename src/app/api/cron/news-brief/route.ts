import { NextResponse } from 'next/server';
import { maybeGenerateNewsBrief } from '@/lib/radio/generateBrief';

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

/** 08:00 and 18:00 Mexico (13:05 / 23:05 UTC in CDT). One MP3 per slot. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  if (force) {
    if (!deskDev()) {
      return NextResponse.json({ error: 'force_local_only' }, { status: 403 });
    }
  } else if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const { episode, skip } = await maybeGenerateNewsBrief({ force });
    const body = {
      ok: true,
      generated: Boolean(episode?.audioUrl),
      id: episode?.id ?? null,
      audioUrl: episode?.audioUrl ?? null,
      slot: episode?.slot ?? null,
      skip: skip ?? null,
      forced: force,
    };
    console.log('news-brief', body);
    return NextResponse.json(body, { headers });
  } catch {
    return NextResponse.json({ ok: false, generated: false }, { status: 502, headers });
  }
}
