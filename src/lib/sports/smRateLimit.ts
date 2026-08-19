/**
 * Sportmonks rate limits are per ENTITY per hour (not per endpoint).
 * Starter = 2000 / entity / hour. Fixture covers /fixtures*, /livescores*.
 * @see docs/AF_SPORTMONKS_RATE_LIMITS.md
 */

import { kvGetJson, kvSetJson, sharedKvEnabled } from '@/lib/sharedKv';

export type SmPlan = 'starter' | 'growth' | 'pro' | 'enterprise';

export type SmEntity =
  | 'Fixture'
  | 'Team'
  | 'Season'
  | 'Standing'
  | 'Type'
  | 'State'
  | 'League'
  | 'Unknown';

export type SmRateLimitInfo = {
  remaining: number;
  resets_in_seconds: number;
  requested_entity: string;
  total?: number;
};

const PLAN_HOURLY: Record<SmPlan, number> = {
  starter: 2_000,
  growth: 2_500,
  pro: 3_000,
  enterprise: 5_000,
};

/** Soft cap — leave headroom so we never ride the hard 429. */
const SOFT_RATIO = 0.9;

type EntityMeter = {
  remaining: number;
  resetsIn: number;
  updatedAt: number;
  timestamps: number[];
};

const meters = new Map<string, EntityMeter>();

export function sportmonksPlan(): SmPlan {
  const raw = (process.env.SPORTMONKS_PLAN ?? 'starter').toLowerCase();
  if (raw === 'growth' || raw === 'pro' || raw === 'enterprise') return raw;
  return 'starter';
}

export function planHourlyLimit(plan = sportmonksPlan()): number {
  return PLAN_HOURLY[plan];
}

export function softHourlyLimit(plan = sportmonksPlan()): number {
  return Math.floor(planHourlyLimit(plan) * SOFT_RATIO);
}

/** Map request path → Sportmonks entity bucket. */
export function entityForPath(path: string): SmEntity {
  if (path.startsWith('/livescores') || path.startsWith('/fixtures')) return 'Fixture';
  if (path.startsWith('/rounds')) return 'Unknown'; // Round entity, not the live Fixture meter
  if (path.startsWith('/seasons')) return 'Season';
  if (path.startsWith('/teams')) return 'Team';
  if (path.startsWith('/standings')) return 'Standing';
  if (path.includes('/types')) return 'Type';
  if (path.includes('/states')) return 'State';
  if (path.startsWith('/leagues')) return 'League';
  return 'Unknown';
}

function meter(entity: string): EntityMeter {
  let m = meters.get(entity);
  if (!m) {
    m = { remaining: planHourlyLimit(), resetsIn: 3600, updatedAt: 0, timestamps: [] };
    meters.set(entity, m);
  }
  return m;
}

/** Shared meter snapshot lives in KV so every isolate sees the true remaining. */
type SharedMeter = { remaining: number; resetsIn: number };
function meterKvKey(entity: string): string {
  return `smrate-${entity}`;
}

const hydratingMeters = new Set<string>();

/** Cold isolate: pull the last-known remaining from KV once (non-blocking). */
function hydrateMeterFromKv(entity: string): void {
  if (!sharedKvEnabled() || hydratingMeters.has(entity)) return;
  hydratingMeters.add(entity);
  void kvGetJson<SharedMeter>(meterKvKey(entity))
    .then((row) => {
      if (!row?.data) return;
      const m = meter(entity);
      if (m.updatedAt === 0) {
        m.remaining = row.data.remaining;
        m.resetsIn = row.data.resetsIn;
        m.updatedAt = Date.now();
      }
    })
    .finally(() => hydratingMeters.delete(entity));
}

export function noteSmRateLimit(info?: SmRateLimitInfo | null): void {
  if (!info?.requested_entity) return;
  const m = meter(info.requested_entity);
  m.remaining = info.remaining;
  m.resetsIn = info.resets_in_seconds;
  m.updatedAt = Date.now();
  // Publish the authoritative remaining so idle isolates don't over-spend (off the response path).
  if (sharedKvEnabled()) {
    void kvSetJson(
      meterKvKey(info.requested_entity),
      { remaining: info.remaining, resetsIn: info.resets_in_seconds } satisfies SharedMeter,
      Math.max(1_000, info.resets_in_seconds * 1_000)
    );
  }
  if (info.remaining < 200) {
    console.warn(
      `[sportmonks] low ${info.requested_entity}: ${info.remaining} remaining, resets in ${info.resets_in_seconds}s`
    );
  }
}

/** Last-known shared remaining for an entity (ops/health). */
export async function getSharedRemaining(entity: SmEntity): Promise<number | null> {
  if (!sharedKvEnabled()) return null;
  const row = await kvGetJson<SharedMeter>(meterKvKey(entity));
  return row?.data?.remaining ?? null;
}

/** Snapshot for ops / future /api health. */
export function getSmRateSnapshot(): Record<
  string,
  { remaining: number; resetsIn: number; localHourCount: number; softCap: number }
> {
  const soft = softHourlyLimit();
  const out: Record<
    string,
    { remaining: number; resetsIn: number; localHourCount: number; softCap: number }
  > = {};
  const now = Date.now();
  for (const [entity, m] of meters) {
    const localHourCount = m.timestamps.filter((t) => now - t < 3_600_000).length;
    out[entity] = {
      remaining: m.remaining,
      resetsIn: m.resetsIn,
      localHourCount,
      softCap: soft,
    };
  }
  return out;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Soft client throttle before a request. Uses local sliding hour + last
 * `remaining` from Sportmonks when available.
 */
export async function beforeSmRequest(entity: SmEntity): Promise<void> {
  const soft = softHourlyLimit();
  const m = meter(entity);
  // Cold isolate: seed remaining from KV once so we respect the global budget (non-blocking).
  if (m.updatedAt === 0) hydrateMeterFromKv(entity);
  const now = Date.now();
  m.timestamps = m.timestamps.filter((t) => now - t < 3_600_000);

  // Soft cap: brief pause only — never stall UX for seconds waiting on the hour window.
  if (m.timestamps.length >= soft) {
    console.warn(
      `[sportmonks] soft-throttle ${entity}: ${m.timestamps.length}/${soft} (allowing with short pause)`
    );
    await sleep(200);
  } else if (m.updatedAt && m.remaining <= 0) {
    await sleep(400);
  } else if (m.updatedAt && m.remaining < 50) {
    await sleep(150);
  }

  m.timestamps.push(Date.now());
}
