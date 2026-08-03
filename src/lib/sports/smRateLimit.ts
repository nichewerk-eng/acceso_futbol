/**
 * Sportmonks rate limits are per ENTITY per hour (not per endpoint).
 * Starter = 2000 / entity / hour. Fixture covers /fixtures*, /livescores*.
 * @see docs/AF_SPORTMONKS_RATE_LIMITS.md
 */

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

export function noteSmRateLimit(info?: SmRateLimitInfo | null): void {
  if (!info?.requested_entity) return;
  const m = meter(info.requested_entity);
  m.remaining = info.remaining;
  m.resetsIn = info.resets_in_seconds;
  m.updatedAt = Date.now();
  if (info.remaining < 200) {
    console.warn(
      `[sportmonks] low ${info.requested_entity}: ${info.remaining} remaining, resets in ${info.resets_in_seconds}s`
    );
  }
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
