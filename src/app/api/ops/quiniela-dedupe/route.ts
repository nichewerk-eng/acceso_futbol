import { NextResponse } from 'next/server';
import { getAccount } from '@/lib/quiniela/account';
import { sanitizeName } from '@/lib/quiniela/name';
import { jornadaKeyFor } from '@/lib/quiniela/service';
import { delPicks, listPicks } from '@/lib/quiniela/store';
import type { Outcome } from '@/lib/quiniela/types';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { jornadaNumber } from '@/lib/sports/jornada';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One-time cleanup for anon→account claim twins. The Phase 1 claim (shipped
 * before the dedupe fix) copied an anonymous card onto the new account but left
 * the anon row behind, so a claimed player showed up twice with an identical
 * score. This scans every jornada hash and removes an entry only when it is an
 * *exact twin* — same name + byte-identical picks — of an account-linked entry
 * and is itself NOT an account (i.e. the leftover anon row). Ambiguous groups
 * (all-anon, all-account, diverged cards) are left untouched.
 *
 * `GET` previews the plan (deletes nothing). `POST` applies it. Prod requires
 * `Authorization: Bearer <CRON_SECRET>`; dev is open.
 */
function allowed(req: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

function pickSig(picks: Record<string, Outcome>): string {
  return Object.entries(picks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, o]) => `${id}:${o}`)
    .join(',');
}

interface RemovalPlan {
  jornadaKey: string;
  userId: string;
  name: string;
}

async function buildPlan(): Promise<{ jornadas: number[]; plan: RemovalPlan[] }> {
  const { fixtures } = await fetchLigaMxFixtures();
  const jornadas = [
    ...new Set(
      fixtures.map((f) => jornadaNumber(f.jornada)).filter((n): n is number => n != null)
    ),
  ].sort((a, b) => a - b);

  const plan: RemovalPlan[] = [];
  const isAccount = new Map<string, boolean>();

  for (const n of jornadas) {
    const jornadaKey = jornadaKeyFor(n);
    const entries = await listPicks(jornadaKey);
    if (!entries || entries.length < 2) continue;

    // Group by exact identity fingerprint: normalized name + identical card.
    const groups = new Map<string, typeof entries>();
    for (const e of entries) {
      const name = sanitizeName(e.name);
      if (!name) continue;
      const key = `${name.toLowerCase()}#${pickSig(e.picks)}`;
      const g = groups.get(key) ?? [];
      g.push(e);
      groups.set(key, g);
    }

    for (const g of groups.values()) {
      if (g.length < 2) continue;
      // Resolve account status once per id (cheap cache across jornadas).
      for (const e of g) {
        if (!isAccount.has(e.userId)) {
          isAccount.set(e.userId, Boolean(await getAccount(e.userId)));
        }
      }
      const anons = g.filter((e) => !isAccount.get(e.userId));
      const hasAccount = g.some((e) => isAccount.get(e.userId));
      // Only prune anon twins when a real account already holds the same card.
      if (hasAccount && anons.length > 0) {
        for (const e of anons) {
          plan.push({ jornadaKey, userId: e.userId, name: sanitizeName(e.name)! });
        }
      }
    }
  }

  return { jornadas, plan };
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { jornadas, plan } = await buildPlan();
  return NextResponse.json(
    {
      ok: true,
      mode: 'dry-run',
      hint: 'POST to this route (same auth) to apply.',
      scannedJornadas: jornadas.length,
      wouldRemove: plan.length,
      plan,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { jornadas, plan } = await buildPlan();
  for (const { jornadaKey, userId } of plan) {
    await delPicks(jornadaKey, userId);
  }
  return NextResponse.json(
    {
      ok: true,
      mode: 'applied',
      scannedJornadas: jornadas.length,
      removed: plan.length,
      plan,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
