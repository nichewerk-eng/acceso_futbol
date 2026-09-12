import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { kvGetJson, kvSetJson } from '@/lib/sharedKv';
import type { TomaVideoPlan, TomaVideoRecord } from './types';

const TTL_MS = 21 * 24 * 60 * 60_000;
const LOCAL_DIR = path.join(process.cwd(), '.toma-local');

function storeKey(episodeId: string): string {
  return `toma-video-${episodeId}`;
}

function localPlanPath(episodeId: string): string {
  return path.join(LOCAL_DIR, `${episodeId}.video.json`);
}

export function localVideoPath(episodeId: string): string {
  return path.join(LOCAL_DIR, `${episodeId}.mp4`);
}

export async function putVideoRecord(rec: TomaVideoRecord): Promise<void> {
  await kvSetJson(storeKey(rec.episodeId), rec, TTL_MS);
  try {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(localPlanPath(rec.episodeId), JSON.stringify(rec, null, 2));
  } catch {
    /* local cache best-effort */
  }
}

export async function getVideoRecord(episodeId: string): Promise<TomaVideoRecord | null> {
  const hit = await kvGetJson<TomaVideoRecord>(storeKey(episodeId));
  if (hit?.data?.plan) return hit.data;
  try {
    const raw = await readFile(localPlanPath(episodeId), 'utf8');
    return JSON.parse(raw) as TomaVideoRecord;
  } catch {
    return null;
  }
}

export async function saveLocalVideoPlan(plan: TomaVideoPlan): Promise<void> {
  await putVideoRecord({ episodeId: plan.episodeId, plan });
}
