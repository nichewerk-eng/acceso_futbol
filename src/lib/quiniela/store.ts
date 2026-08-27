import { kvDel, kvHdel, kvHget, kvHgetall, kvHset, sharedKvEnabled } from '@/lib/sharedKv';
import type { QuinielaPicks } from './types';

/**
 * Quiniela pick storage — one Upstash hash per jornada
 * (`af:quiniela:picks:{jornadaKey}`, field = userId, value = JSON). Durable (no
 * TTL) so the leaderboard survives isolates. In-memory fallback when KV is off.
 */

const mem = new Map<string, Map<string, QuinielaPicks>>();

function hashKey(jornadaKey: string): string {
  return `quiniela:picks:${jornadaKey}`;
}

export async function putPicks(jornadaKey: string, rec: QuinielaPicks): Promise<void> {
  if (sharedKvEnabled()) {
    await kvHset(hashKey(jornadaKey), rec.userId, JSON.stringify(rec));
    return;
  }
  const m = mem.get(jornadaKey) ?? new Map<string, QuinielaPicks>();
  m.set(rec.userId, rec);
  mem.set(jornadaKey, m);
}

/** `null` means the hash could not be read — not that nobody has played. */
export async function listPicks(jornadaKey: string): Promise<QuinielaPicks[] | null> {
  if (!sharedKvEnabled()) {
    return [...(mem.get(jornadaKey)?.values() ?? [])];
  }
  const all = await kvHgetall(hashKey(jornadaKey));
  if (all == null) return null;
  const out: QuinielaPicks[] = [];
  for (const raw of Object.values(all)) {
    try {
      out.push(JSON.parse(raw) as QuinielaPicks);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

export async function getPicks(jornadaKey: string, userId: string): Promise<QuinielaPicks | null> {
  if (!sharedKvEnabled()) {
    return mem.get(jornadaKey)?.get(userId) ?? null;
  }
  const raw = await kvHget(hashKey(jornadaKey), userId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuinielaPicks;
  } catch {
    return null;
  }
}

/** Remove one player's card from a jornada (used to retire an anon id on claim). */
export async function delPicks(jornadaKey: string, userId: string): Promise<void> {
  if (sharedKvEnabled()) {
    await kvHdel(hashKey(jornadaKey), userId);
    return;
  }
  mem.get(jornadaKey)?.delete(userId);
}

/** Wipe every card for a jornada (ops reset). Returns how many were removed. */
export async function clearPicks(jornadaKey: string): Promise<number> {
  if (sharedKvEnabled()) {
    const all = await kvHgetall(hashKey(jornadaKey));
    const n = Object.keys(all ?? {}).length;
    if (n > 0) await kvDel(hashKey(jornadaKey));
    return n;
  }
  const n = mem.get(jornadaKey)?.size ?? 0;
  mem.delete(jornadaKey);
  return n;
}
