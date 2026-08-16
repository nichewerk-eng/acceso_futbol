import { NextResponse } from 'next/server';
import { putSub, type PushSub } from '@/lib/push/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  clubId?: string | null;
  elTri?: boolean;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const s = body.subscription;
  if (!s?.endpoint || !s.keys?.p256dh || !s.keys?.auth) {
    return NextResponse.json({ error: 'invalid_subscription' }, { status: 400 });
  }

  const sub: PushSub = {
    endpoint: s.endpoint,
    keys: { p256dh: s.keys.p256dh, auth: s.keys.auth },
    clubId: typeof body.clubId === 'string' ? body.clubId : null,
    elTri: Boolean(body.elTri),
    ua: req.headers.get('user-agent') ?? undefined,
    ts: Date.now(),
  };

  const id = await putSub(sub);
  return NextResponse.json({ ok: true, id });
}
