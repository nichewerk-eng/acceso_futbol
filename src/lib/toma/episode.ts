import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { isMexicoDay, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';
import { setAudio } from '@/lib/radio/cache';
import { kvGetJson, kvSetJson, kvSetNx, sharedKvEnabled } from '@/lib/sharedKv';
import type { JornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports/types';

export type TomaShowKind = 'antes' | 'dia' | 'cierre';

export const EPISODE_ANTES = 'antes';
export const EPISODE_CIERRE = 'cierre';

export type TomaEpisode = {
  id: string;
  jornadaNum: number;
  dayKey: string;
  kind?: TomaShowKind;
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
const LOCAL_DIR = path.join(process.cwd(), '.toma-local');

function localSafeId(id: string): string | null {
  if (!id.startsWith('toma-ep-') || id.includes('/') || id.includes('..')) return null;
  return id;
}

function localMetaPath(id: string): string {
  return path.join(LOCAL_DIR, `${id}.json`);
}

function localAudioPath(id: string, contentType: string): string {
  const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
  return path.join(LOCAL_DIR, `${id}.${ext}`);
}

export async function saveLocalEpisode(ep: TomaEpisode, bytes: Buffer): Promise<void> {
  const id = localSafeId(ep.id);
  if (!id) return;
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(localMetaPath(id), JSON.stringify(ep));
  await writeFile(localAudioPath(id, ep.contentType), bytes);
}

export async function loadLocalAudio(
  id: string
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const safe = localSafeId(id);
  if (!safe) return null;
  for (const contentType of ['audio/wav', 'audio/mpeg'] as const) {
    try {
      const bytes = await readFile(localAudioPath(safe, contentType));
      if (bytes.length > 0) return { bytes, contentType };
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadLocalEpisode(key: string): Promise<TomaEpisode | null> {
  const id = localSafeId(key);
  if (!id) return null;
  try {
    const ep = JSON.parse(await readFile(localMetaPath(id), 'utf8')) as TomaEpisode;
    const audio = await loadLocalAudio(id);
    if (!ep?.audioUrl || !audio) return null;
    setAudio(id, audio.bytes, audio.contentType);
    mem.set(key, ep);
    return ep;
  } catch {
    return null;
  }
}

export function episodeStoreKey(jornadaNum: number, dayKey: string): string {
  return `toma-ep-j${jornadaNum}-${dayKey}`;
}

export function showKindFromDayKey(dayKey: string): TomaShowKind {
  if (dayKey === EPISODE_ANTES) return 'antes';
  if (dayKey === EPISODE_CIERRE) return 'cierre';
  return 'dia';
}

function jornadaRows(jornada: JornadaOverview): Fixture[] {
  return [...jornada.live, ...jornada.played, ...jornada.upcoming];
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

/** Smoke-test / desk override: today's key, sealed scores only. */
export function forceDaySlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } {
  return {
    dayKey: mexicoDayKey(new Date(now)),
    fixtures: jornada.played,
  };
}

/** Whole fecha still upcoming, first kick not yet. */
export function preJornadaSlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const all = jornadaRows(jornada);
  if (all.length === 0) return null;
  if (jornada.live.length > 0 || jornada.played.length > 0) return null;
  if (all.some((f) => f.state === 'in' || f.state === 'post')) return null;
  const firstKick = Math.min(...all.map((f) => +new Date(f.date)));
  if (!Number.isFinite(firstKick) || now >= firstKick) return null;
  return { dayKey: EPISODE_ANTES, fixtures: [] };
}

/** Every game in the fecha is FT and settled. */
export function closedJornadaSlate(
  jornada: JornadaOverview,
  now = Date.now()
): { dayKey: string; fixtures: Fixture[] } | null {
  const all = jornadaRows(jornada);
  if (all.length === 0 || jornada.played.length === 0) return null;
  if (all.some((f) => f.state === 'pre' || f.state === 'in')) return null;
  const lastKick = Math.max(...all.map((f) => +new Date(f.date)));
  if (!Number.isFinite(lastKick) || now < lastKick + SETTLE_MS) return null;
  return { dayKey: EPISODE_CIERRE, fixtures: jornada.played };
}

/** Desk play order: cierre → today → yesterday (if today has not started) → antes. */
export async function pickPlayableEpisode(
  jornada: JornadaOverview,
  now = Date.now()
): Promise<TomaEpisode | null> {
  const today = mexicoDayKey(new Date(now));
  const wrap = await getStoredEpisode(jornada.number, EPISODE_CIERRE);
  if (wrap) return wrap;

  const todayEp = await getStoredEpisode(jornada.number, today);
  if (todayEp) return todayEp;

  const todayFx = jornadaRows(jornada).filter((f) => isMexicoDay(f.date, today));
  const todayStarted = todayFx.some((f) => f.state === 'in' || f.state === 'post');
  if (!todayStarted) {
    const prior = await getStoredEpisode(jornada.number, shiftDayKey(today, -1));
    if (prior) return prior;
  }

  if (jornada.live.length === 0 && jornada.played.length === 0) {
    return getStoredEpisode(jornada.number, EPISODE_ANTES);
  }
  return null;
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
  if (process.env.NODE_ENV === 'development') {
    return loadLocalEpisode(key);
  }
  return null;
}

export async function putStoredEpisode(
  ep: TomaEpisode,
  opts?: { localOnly?: boolean }
): Promise<void> {
  const key = episodeStoreKey(ep.jornadaNum, ep.dayKey);
  mem.set(key, ep);
  if (!opts?.localOnly) await kvSetJson(key, ep, EPISODE_TTL_MS);
}

export async function tryEpisodeLock(
  storeKey: string,
  opts?: { localOnly?: boolean }
): Promise<boolean> {
  if (!opts?.localOnly && sharedKvEnabled()) {
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
