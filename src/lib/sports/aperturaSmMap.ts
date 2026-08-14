import {
  APERTURA_2026_FIXTURES,
  aperturaStaticRows,
  bakedAperturaSmMap,
  isSportmonksFixtureId,
  type AperturaStaticRow,
} from '@/fixtures/ligamx-apertura-2026';
import type { LigaMXFixture } from '@/app/api/ligamx/fixtures/route';
import { peekCache, setCache, singleFlight } from '@/lib/apiCache';
import { kvSetJson, sharedKvEnabled } from '@/lib/sharedKv';
import { dayPairKey, scheduleAbbr } from './ligaMxAbbr';
import { smFetch } from './sm/client';

const MAP_KEY = 'apertura-sm-map-v1';
const REFRESH_LOCK = 'apertura-sm-map-refresh-v1';
/** Full Sportmonks reconcile at most once per hour. Overlay remember() can update sooner. */
const REFRESH_EVERY_MS = 60 * 60_000;
const KV_TTL_MS = 24 * 60 * 60_000;

function ligaMxLeagueId(): number {
  return 743;
}

function sportmonksEnabled(): boolean {
  return Boolean(process.env.SPORTMONKS_API_TOKEN?.trim());
}

type SmMap = Record<string, string>;

type SmHit = {
  id: string;
  date: string;
  home: string;
  away: string;
  jornadaNum: number | null;
};

function jornadaNum(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = String(label).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function persist(map: SmMap): SmMap {
  setCache(MAP_KEY, map);
  if (sharedKvEnabled()) void kvSetJson(MAP_KEY, map, KV_TTL_MS);
  return map;
}

export function peekAperturaSmMap(): SmMap {
  return peekCache<SmMap>(MAP_KEY) ?? bakedAperturaSmMap();
}

export function resolveAperturaSmFixtureId(id: string): string | null {
  const map = peekAperturaSmMap();
  if (map[id]) return map[id];
  if (isSportmonksFixtureId(id)) return id;
  return null;
}

export function aperturaCalendar(): LigaMXFixture[] {
  const map = peekAperturaSmMap();
  return APERTURA_2026_FIXTURES.map((f, i) => {
    const staticId = `static-ap26-${i + 1}`;
    const id = map[staticId] ?? map[f.id] ?? f.id;
    return id === f.id ? f : { ...f, id };
  });
}

export function findAperturaFixture(id: string): LigaMXFixture | null {
  const sm = resolveAperturaSmFixtureId(id);
  const cal = aperturaCalendar();
  if (sm) return cal.find((f) => f.id === sm) ?? null;
  return cal.find((f) => f.id === id) ?? null;
}

export function rememberAperturaSmIds(pairs: { staticId: string; smId: string }[]): void {
  if (pairs.length === 0) return;
  const prev = peekAperturaSmMap();
  let changed = false;
  const next: SmMap = { ...prev };
  for (const { staticId, smId } of pairs) {
    if (!staticId.startsWith('static-ap26-') || !isSportmonksFixtureId(smId)) continue;
    if (next[staticId] === smId && next[smId] === smId) continue;
    next[staticId] = smId;
    next[smId] = smId;
    changed = true;
  }
  if (changed) persist(next);
}

/** Fire-and-forget. No-ops if Sportmonks is off or the map was refreshed recently. */
export function refreshAperturaSmMap(): void {
  if (!sportmonksEnabled()) return;
  const last = peekCache<{ t: number }>(REFRESH_LOCK);
  if (last && Date.now() - last.t < REFRESH_EVERY_MS) return;
  void singleFlight('apertura-sm-refresh-inflight', 30_000, async () => {
    const before = Object.keys(peekAperturaSmMap()).length;
    const next = await loadAperturaSmMap();
    if (Object.keys(next).length >= before) {
      setCache(REFRESH_LOCK, { t: Date.now() });
    }
    return true;
  }).catch(() => {});
}

async function loadAperturaSmMap(): Promise<SmMap> {
  const prev = peekAperturaSmMap();
  try {
    const hits = await fetchSeasonHits();
    const mapped = matchHitsToCalendar(hits, aperturaStaticRows());
    return persist({ ...prev, ...mapped });
  } catch {
    return prev;
  }
}

async function fetchSeasonHits(): Promise<SmHit[]> {
  const rows = aperturaStaticRows();
  const times = rows.map((r) => +new Date(r.date)).filter(Number.isFinite);
  if (times.length === 0) return [];
  const pad = 2 * 86400_000;
  let cursor = Math.min(...times) - pad;
  const end = Math.max(...times) + pad;
  const chunks: [string, string][] = [];
  const maxSpan = 90 * 86400_000;
  while (cursor <= end) {
    const chunkEnd = Math.min(cursor + maxSpan, end);
    chunks.push([ymdUtc(cursor), ymdUtc(chunkEnd)]);
    cursor = chunkEnd + 86400_000;
  }
  const nested = await Promise.all(chunks.map(([from, to]) => fetchBetween(from, to)));
  return nested.flat();
}

function ymdUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

async function fetchBetween(from: string, to: string): Promise<SmHit[]> {
  const out: SmHit[] = [];
  for (let page = 1; page <= 20; page++) {
    const json = await smFetch<{
      data?: {
        id: number;
        starting_at?: string;
        round?: { name?: string };
        participants?: {
          short_code?: string;
          meta?: { location?: string };
        }[];
      }[];
      pagination?: { has_more?: boolean };
    }>(
      `/fixtures/between/${from}/${to}`,
      {
        include: 'participants;round',
        filters: `fixtureLeagues:${ligaMxLeagueId()}`,
        per_page: '50',
        page: String(page),
      },
      'catalog'
    );
    for (const f of json.data ?? []) {
      const hit = toHit(f);
      if (hit) out.push(hit);
    }
    if (!json.pagination?.has_more) break;
  }
  return out;
}

function toHit(f: {
  id: number;
  starting_at?: string;
  round?: { name?: string };
  participants?: { short_code?: string; meta?: { location?: string } }[];
}): SmHit | null {
  const parts = f.participants ?? [];
  const home = parts.find((p) => p.meta?.location === 'home') ?? parts[0];
  const away = parts.find((p) => p.meta?.location === 'away') ?? parts[1];
  if (!home || !away || !f.starting_at) return null;
  const date = `${String(f.starting_at).replace(' ', 'T')}Z`;
  return {
    id: String(f.id),
    date,
    home: scheduleAbbr(home.short_code ?? 'LOC'),
    away: scheduleAbbr(away.short_code ?? 'VIS'),
    jornadaNum: jornadaNum(f.round?.name),
  };
}

function matchHitsToCalendar(hits: SmHit[], rows: AperturaStaticRow[]): SmMap {
  const byDay = new Map<string, SmHit>();
  const unused = new Set(hits);
  for (const h of hits) {
    byDay.set(dayPairKey(h.date, h.home, h.away), h);
  }

  const out: SmMap = {};
  const take = (h: SmHit, staticId: string) => {
    out[staticId] = h.id;
    out[h.id] = h.id;
    unused.delete(h);
  };

  const leftover: AperturaStaticRow[] = [];
  for (const row of rows) {
    const hit = byDay.get(dayPairKey(row.date, row.home, row.away));
    if (hit) take(hit, row.staticId);
    else leftover.push(row);
  }

  for (const row of leftover) {
    const pair = [...unused].filter((h) => h.home === row.home && h.away === row.away);
    if (pair.length === 1) {
      take(pair[0]!, row.staticId);
      continue;
    }
    const j = jornadaNum(row.jornada);
    const byJ = [...unused].filter(
      (h) => h.home === row.home && h.away === row.away && h.jornadaNum === j
    );
    if (byJ.length === 1) take(byJ[0]!, row.staticId);
  }

  return out;
}

export function rememberOverlaySmIds(
  calendar: { id: string }[],
  merged: { id: string }[]
): void {
  const pairs: { staticId: string; smId: string }[] = [];
  for (let i = 0; i < calendar.length && i < merged.length; i++) {
    const smId = merged[i]!.id;
    if (!isSportmonksFixtureId(smId)) continue;
    pairs.push({ staticId: `static-ap26-${i + 1}`, smId });
  }
  rememberAperturaSmIds(pairs);
}
