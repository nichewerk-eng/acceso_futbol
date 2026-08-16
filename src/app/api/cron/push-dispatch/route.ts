import { NextResponse } from 'next/server';
import { dispatchPush } from '@/lib/push/dispatch';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  if (req.headers.get('x-vercel-cron') === '1') return true;
  return false;
}

/** ~1-minute Vercel cron: diff the shared board and send goal/kickoff pushes. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const dev = process.env.NODE_ENV === 'development';
  if (!authorized(req) && !(force && dev)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const res = await dispatchPush({ force });
  return NextResponse.json(res, { status: res.ok ? 200 : 503 });
}
