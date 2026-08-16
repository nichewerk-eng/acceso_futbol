import { NextResponse } from 'next/server';
import { removeSub } from '@/lib/push/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: { endpoint?: string };
  try {
    body = (await req.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  if (!body.endpoint) {
    return NextResponse.json({ error: 'no_endpoint' }, { status: 400 });
  }
  await removeSub(body.endpoint);
  return NextResponse.json({ ok: true });
}
