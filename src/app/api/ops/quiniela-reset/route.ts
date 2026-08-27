import { NextResponse } from 'next/server';
import { countAccounts } from '@/lib/quiniela/account';
import { QUINIELA_FROM } from '@/lib/quiniela/jornada';
import { countSeasonRecords, resetSeason } from '@/lib/quiniela/season';
import { jornadaKeyFor } from '@/lib/quiniela/service';
import { clearPicks, listPicks } from '@/lib/quiniela/store';
import { fetchLigaMxFixtures } from '@/lib/sports/espnFallback';
import { jornadaNumber } from '@/lib/sports/jornada';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Wipe quiniela history so the game starts clean at `QUINIELA_FROM`.
 * Deletes every jornada pick hash + the season rollup. Email accounts stay
 * (people keep their magic-link identity; streaks start over at J6).
 *
 * `GET` previews. `POST` applies. Prod requires `Authorization: Bearer <CRON_SECRET>`.
 */
function allowed(req: Request): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

async function jornadaNums(): Promise<number[]> {
  const { fixtures } = await fetchLigaMxFixtures();
  const fromFixtures = fixtures
    .map((f) => jornadaNumber(f.jornada))
    .filter((n): n is number => n != null);
  // Always include 1..FROM so leftover J1–J5 hashes are removed even if the
  // live calendar has already dropped them.
  return [...new Set([...Array.from({ length: QUINIELA_FROM }, (_, i) => i + 1), ...fromFixtures])].sort(
    (a, b) => a - b
  );
}

async function preview(): Promise<{
  from: number;
  accountsKept: number;
  seasonRecords: number;
  picks: { jornadaKey: string; entries: number }[];
}> {
  const nums = await jornadaNums();
  const picks: { jornadaKey: string; entries: number }[] = [];
  for (const n of nums) {
    const jornadaKey = jornadaKeyFor(n);
    const entries = (await listPicks(jornadaKey))?.length ?? 0;
    if (entries > 0) picks.push({ jornadaKey, entries });
  }
  return {
    from: QUINIELA_FROM,
    accountsKept: await countAccounts(),
    seasonRecords: await countSeasonRecords(),
    picks,
  };
}

export async function GET(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const snap = await preview();
  return NextResponse.json(
    {
      ok: true,
      mode: 'dry-run',
      hint: 'POST to wipe picks + season. Accounts are kept.',
      ...snap,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  if (!allowed(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const before = await preview();
  const nums = await jornadaNums();
  const cleared: { jornadaKey: string; removed: number }[] = [];
  for (const n of nums) {
    const jornadaKey = jornadaKeyFor(n);
    const removed = await clearPicks(jornadaKey);
    if (removed > 0) cleared.push({ jornadaKey, removed });
  }
  const seasonRemoved = await resetSeason();
  return NextResponse.json(
    {
      ok: true,
      mode: 'applied',
      from: QUINIELA_FROM,
      accountsKept: before.accountsKept,
      seasonRemoved,
      picksCleared: cleared,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
