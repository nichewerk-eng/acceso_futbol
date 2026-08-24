import { NextResponse } from 'next/server';
import { trackServer } from '@/lib/analytics/trackServer';
import { consumeMagicToken } from '@/lib/quiniela/account';
import { mergePicks } from '@/lib/quiniela/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Magic-link landing: consume the token, merge the anon card into the account,
 * then redirect to /quiniela with the accountId so the client adopts it as its
 * durable id. No cookie/session — the id itself is the (low-stakes) identity.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  const payload = await consumeMagicToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL('/quiniela?login=expired', req.url));
  }

  if (payload.anonId) {
    try {
      await mergePicks(payload.anonId, payload.accountId);
    } catch {
      /* merge is best-effort; never block the claim */
    }
  }

  void trackServer('Quiniela magic verified');
  const dest = new URL('/quiniela', req.url);
  dest.searchParams.set('account', payload.accountId);
  return NextResponse.redirect(dest);
}
