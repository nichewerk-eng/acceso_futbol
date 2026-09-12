import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { kvGetJson, kvSetJson } from '@/lib/sharedKv';
import type { NewsVideoPlan, NewsVideoRecord } from './types';

const TTL_MS = 4 * 24 * 60 * 60_000;
const LOCAL_DIR = path.join(process.cwd(), '.toma-local');

function storeKey(episodeId: string): string {
  return `news-video-${episodeId}`;
}

function localPlanPath(episodeId: string): string {
  return path.join(LOCAL_DIR, `${episodeId}.video.json`);
}

export function localNewsVideoPath(episodeId: string): string {
  return path.join(LOCAL_DIR, `${episodeId}.mp4`);
}

export async function putNewsVideoRecord(rec: NewsVideoRecord): Promise<void> {
  await kvSetJson(storeKey(rec.episodeId), rec, TTL_MS);
  try {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(localPlanPath(rec.episodeId), JSON.stringify(rec, null, 2));
  } catch {
    /* best-effort */
  }
}

export async function getNewsVideoRecord(episodeId: string): Promise<NewsVideoRecord | null> {
  const hit = await kvGetJson<NewsVideoRecord>(storeKey(episodeId));
  if (hit?.data?.plan) return hit.data;
  try {
    const raw = await readFile(localPlanPath(episodeId), 'utf8');
    return JSON.parse(raw) as NewsVideoRecord;
  } catch {
    return null;
  }
}
