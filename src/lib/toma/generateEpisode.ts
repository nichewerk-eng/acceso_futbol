import { put } from '@vercel/blob';
import { setAudio } from '@/lib/radio/cache';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';
import { getJornadaTakePayload } from '@/lib/sports/jornadaTakeAi';
import { jornadaTakeDeskTitle } from '@/lib/sports/jornadaTake';
import type { Fixture } from '@/lib/sports/types';
import {
  closedDaySlate,
  episodeBlobPath,
  episodeStoreKey,
  getStoredEpisode,
  inflightEpisode,
  putStoredEpisode,
  trackInflight,
  tryEpisodeLock,
  type TomaEpisode,
} from '@/lib/toma/episode';
import { geminiTtsEnabled, synthesizeTwoHost } from '@/lib/toma/geminiTts';
import { sourceHash, writeTwoHostScript } from '@/lib/toma/writeDialogue';

function blobEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim()
  );
}

async function storeAudio(
  id: string,
  bytes: Buffer,
  contentType: string
): Promise<{ audioUrl: string; blobPath?: string } | null> {
  if (blobEnabled()) {
    try {
      const blobPath = episodeBlobPath(id, contentType);
      await put(blobPath, bytes, {
        access: 'private',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        multipart: bytes.length > 4_000_000,
      });
      return {
        blobPath,
        audioUrl: `/api/toma/audio/${encodeURIComponent(id)}`,
      };
    } catch {
      return null;
    }
  }
  setAudio(id, bytes, contentType);
  return { audioUrl: `/api/radio/audio/${encodeURIComponent(id)}` };
}

async function runGenerate(
  jornada: JornadaOverview,
  closed: { dayKey: string; fixtures: Fixture[] },
  storeKey: string
): Promise<TomaEpisode | null> {
  const take = await getJornadaTakePayload().catch(() => null);
  if (!take) return null;
  const hash = sourceHash(take, closed.fixtures);
  const existing = await getStoredEpisode(jornada.number, closed.dayKey);
  if (existing && existing.sourceHash === hash && existing.audioUrl) return existing;

  const locked = await tryEpisodeLock(storeKey);
  if (!locked) return existing;

  const transcript = await writeTwoHostScript(take, closed.fixtures);
  if (!transcript) return existing;
  const audio = await synthesizeTwoHost(transcript);
  if (!audio) return existing;
  const stored = await storeAudio(storeKey, audio.bytes, audio.contentType);
  if (!stored) return existing;
  const episode: TomaEpisode = {
    id: storeKey,
    jornadaNum: jornada.number,
    dayKey: closed.dayKey,
    title: jornadaTakeDeskTitle(take),
    transcript,
    sourceHash: hash,
    audioUrl: stored.audioUrl,
    blobPath: stored.blobPath,
    contentType: audio.contentType,
    generatedAt: new Date().toISOString(),
  };
  await putStoredEpisode(episode);
  return episode;
}

/**
 * Zero-touch: if today's jornada slate is closed and Gemini is configured,
 * write one two-host episode. No-ops when live, already stored, or unconfigured.
 */
export async function maybeGenerateTomaEpisode(): Promise<TomaEpisode | null> {
  if (!geminiTtsEnabled()) return null;

  const jornada = await getJornadaOverview().catch(() => null);
  if (!jornada) return null;
  const closed = closedDaySlate(jornada);
  if (!closed) return null;

  const storeKey = episodeStoreKey(jornada.number, closed.dayKey);
  const pending = inflightEpisode(storeKey);
  if (pending) return pending;

  return trackInflight(storeKey, runGenerate(jornada, closed, storeKey));
}
