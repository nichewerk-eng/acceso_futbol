import { NextResponse } from 'next/server';
import { trackServer } from '@/lib/analytics/trackServer';
import {
  getOrCreateAccount,
  magicCooldownOk,
  mintMagicToken,
  normalizeEmail,
} from '@/lib/quiniela/account';
import { sendMagicLinkEmail } from '@/lib/quiniela/mail';
import { sanitizeUserId } from '@/lib/quiniela/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  email?: string;
  anonId?: string;
}

/** Email a single-use magic link that lets the caller claim / recover an account. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!email) return NextResponse.json({ error: 'bad_email' }, { status: 400 });
  const anonId = sanitizeUserId(body.anonId) ?? undefined;

  // Generic 200 regardless of whether we actually sent, so we don't leak
  // account existence or rate-limit state. Only send when the cooldown allows.
  if (await magicCooldownOk(email)) {
    const account = await getOrCreateAccount(email);
    const token = await mintMagicToken({ accountId: account.accountId, anonId });
    const url = `${new URL(req.url).origin}/api/quiniela/auth/verify?token=${encodeURIComponent(token)}`;
    await sendMagicLinkEmail({ to: email, url });
    void trackServer('Quiniela magic requested');
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
