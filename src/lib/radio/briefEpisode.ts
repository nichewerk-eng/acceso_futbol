import { shiftDayKey } from '@/lib/radio/phases';
import { briefStoreKey, playableBriefSlot, type NewsBriefSlot } from '@/lib/radio/voiceSchedule';

export type NewsBriefEpisode = {
  id: string;
  dayKey: string;
  slot: NewsBriefSlot;
  title: string;
  transcript: string;
  sourceHash: string;
  audioUrl: string;
  blobPath?: string;
  contentType: string;
  generatedAt: string;
  sources: string[];
};

const EPISODE_TTL_MS = 4 * 24 * 60 * 60_000;
const LOCK_MS = 4 * 60_000;

const mem = new Map<string, NewsBriefEpisode>();
const inflight = new Map<string, Promise<NewsBriefEpisode | null>>();

export function briefBlobPath(id: string, contentType = 'audio/mpeg'): string {
  const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
  return `news/${id}.${ext}`;
}

export function briefLockKey(storeKey: string): string {
  return `${storeKey}-lock`;
}

export async function getStoredBrief(
  dayKey: string,
  slot: NewsBriefSlot
): Promise<NewsBriefEpisode | null> {
  const key = briefStoreKey(dayKey, slot);
  const local = mem.get(key);
  if (local) return local;
  const hit = await kvGetJson<NewsBriefEpisode>(key);
  if (hit?.data?.audioUrl) {
    mem.set(key, hit.data);
    return hit.data;
  }
  return null;
}

export async function getPlayableBrief(now = Date.now()): Promise<NewsBriefEpisode | null> {
  const cur = playableBriefSlot(now);
  const hit = await getStoredBrief(cur.dayKey, cur.slot);
  if (hit) return hit;
  if (cur.slot === 'am') return getStoredBrief(shiftDayKey(cur.dayKey, -1), 'pm');
  return getStoredBrief(cur.dayKey, 'am');
}

export async function putStoredBrief(ep: NewsBriefEpisode): Promise<void> {
  const key = briefStoreKey(ep.dayKey, ep.slot);
  mem.set(key, ep);
  await kvSetJson(key, ep, EPISODE_TTL_MS);
}

export async function tryBriefLock(storeKey: string): Promise<boolean> {
  if (sharedKvEnabled()) return kvSetNx(briefLockKey(storeKey), '1', LOCK_MS);
  return true;
}

export function trackBriefInflight(
  storeKey: string,
  work: Promise<NewsBriefEpisode | null>
): Promise<NewsBriefEpisode | null> {
  inflight.set(storeKey, work);
  return work.finally(() => {
    inflight.delete(storeKey);
  });
}

export function inflightBrief(storeKey: string): Promise<NewsBriefEpisode | null> | undefined {
  return inflight.get(storeKey);
}
