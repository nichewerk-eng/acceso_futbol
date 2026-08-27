import { createHash } from 'node:crypto';
import { kvHdel, kvHgetall, kvHset, sharedKvEnabled } from '@/lib/sharedKv';

/**
 * Durable Web Push subscription registry. Persisted as an Upstash hash
 * (`af:push:subs`, field = sha1(endpoint)) so every Vercel isolate + the
 * dispatch cron read the same list. Falls back to process memory when KV is
 * off (local dev) so the pipeline still works end-to-end in one process.
 */

const SUBS_KEY = 'push:subs';

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  clubId: string | null;
  elTri: boolean;
  ua?: string;
  ts: number;
}

const mem = new Map<string, PushSub>();

export function subId(endpoint: string): string {
  return createHash('sha1').update(endpoint).digest('hex');
}

export async function putSub(sub: PushSub): Promise<string> {
  const id = subId(sub.endpoint);
  if (sharedKvEnabled()) await kvHset(SUBS_KEY, id, JSON.stringify(sub));
  else mem.set(id, sub);
  return id;
}

export async function removeSub(endpoint: string): Promise<void> {
  await removeSubById(subId(endpoint));
}

export async function removeSubById(id: string): Promise<void> {
  if (sharedKvEnabled()) await kvHdel(SUBS_KEY, id);
  else mem.delete(id);
}

export async function listSubs(): Promise<{ id: string; sub: PushSub }[]> {
  if (!sharedKvEnabled()) {
    return [...mem.entries()].map(([id, sub]) => ({ id, sub }));
  }
  const all = await kvHgetall(SUBS_KEY);
  if (!all) return [];
  const out: { id: string; sub: PushSub }[] = [];
  for (const [id, raw] of Object.entries(all)) {
    try {
      out.push({ id, sub: JSON.parse(raw) as PushSub });
    } catch {
      /* skip malformed record */
    }
  }
  return out;
}

export async function countSubs(): Promise<number> {
  return (await listSubs()).length;
}
