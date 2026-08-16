import { NextResponse } from 'next/server';
import { pushConfigured, sendWebPush } from '@/lib/push/send';
import { countSubs, listSubs, removeSubById } from '@/lib/push/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function allowed(req: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

/** Fire a sample push to every stored subscription. Dev-open; prod needs CRON_SECRET. */
export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, error: 'push_not_configured', subs: await countSubs() });
  }
  const subs = await listSubs();
  let sent = 0;
  let pruned = 0;
  for (const { id, sub } of subs) {
    const res = await sendWebPush(sub, {
      title: 'Acceso Fútbol',
      body: 'Avisos activados · te avisamos del saque y cada gol de tu equipo.',
      tag: 'af-test',
      url: '/',
    });
    if (res === 'ok') sent += 1;
    else if (res === 'gone') {
      await removeSubById(id);
      pruned += 1;
    }
  }
  return NextResponse.json({ ok: true, subs: subs.length, sent, pruned });
}
