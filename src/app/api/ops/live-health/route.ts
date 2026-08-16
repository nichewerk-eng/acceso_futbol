import { NextResponse } from 'next/server';
import { sharedKvEnabled } from '@/lib/sharedKv';
import { FRESH } from '@/lib/sports/freshness';
import {
  getSharedRemaining,
  getSmRateSnapshot,
  planHourlyLimit,
  softHourlyLimit,
  sportmonksPlan,
} from '@/lib/sports/smRateLimit';

/** Lightweight ops snapshot — Fixture remaining + infra flags. */
export async function GET() {
  const plan = sportmonksPlan();
  const fixture = getSmRateSnapshot().Fixture;
  // Prefer the KV-shared remaining (global across isolates) when available.
  const shared = await getSharedRemaining('Fixture');
  const remaining = shared ?? fixture?.remaining ?? planHourlyLimit(plan);
  const soft = softHourlyLimit(plan);
  const tight = remaining < 400 || (fixture?.localHourCount ?? 0) > soft * 0.85;

  return NextResponse.json(
    {
      plan,
      planHourly: planHourlyLimit(plan),
      softCap: soft,
      fixture: fixture ?? null,
      sharedRemaining: shared,
      remaining,
      sharedKv: sharedKvEnabled(),
      fresh: {
        clientPollLiveMs: FRESH.clientPollLiveMs,
        apiTtlLiveMs: FRESH.apiTtlLiveMs,
      },
      upgradeSuggested: tight,
      note: tight
        ? 'Fixture bucket is tight — consider Growth/Pro or reduce live surfaces.'
        : 'Headroom OK for current Starter soft cap.',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
