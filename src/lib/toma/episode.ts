import { isMexicoDay, mexicoDayKey } from '@/lib/radio/phases';
import { kvGetJson, kvSetJson, kvSetNx, sharedKvEnabled } from '@/lib/sharedKv';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

export type TomaEpisode = {
  id: string;
  jornadaNum: number;
  dayKey: string;
  title: string;
  transcript: string;
  sourceHash: string;
  audioUrl: string;
  blobPath?: string;
  contentType: string;
  generatedAt: string;
};

const EPISODE_TTL_MS = 21 * 24 * 60 * 60_000;
const LOCK_MS = 4 * 60_000;
const SETTLE_MS = 100 * 60_000;

const mem = new Map<string, TomaEpisode>();
const inflight = new Map<string, Promise<TomaEpisode | null>>();

export function episodeStoreKey(jornadaNum: number, dayKey: string): string {
  return `toma-ep-j${jornadaNum}-${dayKey}`;
}

export function episodeBlobPath(id: string, contentType = 'audio/wav'): string {
  const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
  return `toma/${id}.${ext}`;
}

export function episodeLockKey(storeKey: string): string {
  return `${storeKey}-lock`;
}

/** Today's slate is all FT and long enough after last kickoff to settle. */
export function closedDaySlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const dayKey = mexicoDayKey(new Date(now));
  const all = [...jornada.live, ...jornada.played, ...jornada.upcoming];
  const today = all.filter((f) => isMexicoDay(f.date, dayKey));
  if (today.length === 0) return null;
  if (today.some((f) => f.state === 'pre' || f.state === 'in')) return null;
  const lastKick = Math.max(...today.map((f) => +new Date(f.date)));
  if (!Number.isFinite(lastKick) || now < lastKick + SETTLE_MS) return null;
  return { dayKey, fixtures: today };
}

export async function getStoredEpisode(
  jornadaNum: number,
  dayKey: string
): Promise<TomaEpisode | null> {
  const key = episodeStoreKey(jornadaNum, dayKey);
  const local = mem.get(key);
  if (local) return local;
  const hit = await kvGetJson<TomaEpisode>(key);
  if (hit?.data?.audioUrl) {
    mem.set(key, hit.data);
    return hit.data;
  }
  return null;
}

export async function putStoredEpisode(ep: TomaEpisode): Promise<void> {
  const key = episodeStoreKey(ep.jornadaNum, ep.dayKey);
  mem.set(key, ep);
  await kvSetJson(key, ep, EPISODE_TTL_MS);
}

export async function tryEpisodeLock(storeKey: string): Promise<boolean> {
  if (inflight.has(storeKey)) return false;
  if (sharedKvEnabled()) {
    return kvSetNx(episodeLockKey(storeKey), '1', LOCK_MS);
  }
  return true;
}

export function trackInflight(
  storeKey: string,
  work: Promise<TomaEpisode | null>
): Promise<TomaEpisode | null> {
  inflight.set(storeKey, work);
  return work.finally(() => {
    inflight.delete(storeKey);
  });
}

export function inflightEpisode(storeKey: string): Promise<TomaEpisode | null> | undefined {
  return inflight.get(storeKey);
}
