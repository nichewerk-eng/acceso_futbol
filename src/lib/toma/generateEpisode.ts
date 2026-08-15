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
  forceDaySlate,
  getStoredEpisode,
  inflightEpisode,
  putStoredEpisode,
  saveLocalEpisode,
  trackInflight,
  tryEpisodeLock,
  type TomaEpisode,
} from '@/lib/toma/episode';
import { geminiTtsEnabled, synthesizeTwoHost, TOMA_VOICE_REV } from '@/lib/toma/geminiTts';
import { sourceHash, writeTwoHostScript } from '@/lib/toma/writeDialogue';

export type TomaGenerateSkip =
  | 'no_gemini'
  | 'no_jornada'
  | 'not_closed'
  | 'force_prod'
  | 'no_take'
  | 'no_script'
  | 'no_tts'
  | 'no_store'
  | 'exists';

export type TomaGenerateResult = {
  episode: TomaEpisode | null;
  skip?: TomaGenerateSkip;
};

function blobEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim()
  );
}

function deskDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

async function storeAudio(
  id: string,
  bytes: Buffer,
  contentType: string,
  localOnly: boolean
): Promise<{ audioUrl: string; blobPath?: string } | null> {
  if (!localOnly && blobEnabled()) {
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
        audioUrl: `/api/toma/audio/${encodeURIComponent(id)}?v=${encodeURIComponent(TOMA_VOICE_REV)}`,
      };
    } catch {
      return null;
    }
  }
  setAudio(id, bytes, contentType);
  const q = `?v=${encodeURIComponent(TOMA_VOICE_REV)}`;
  return { audioUrl: `/api/radio/audio/${encodeURIComponent(id)}${q}` };
}

async function runGenerate(
  jornada: JornadaOverview,
  closed: { dayKey: string; fixtures: Fixture[] },
  storeKey: string,
  localOnly: boolean
): Promise<TomaGenerateResult> {
  const take = await getJornadaTakePayload().catch(() => null);
  if (!take) return { episode: null, skip: 'no_take' };
  const hash = `${sourceHash(take, closed.fixtures)}-${TOMA_VOICE_REV}`;
  const existing = await getStoredEpisode(jornada.number, closed.dayKey);
  if (existing && existing.sourceHash === hash && existing.audioUrl) {
    return { episode: existing, skip: 'exists' };
  }

  const locked = await tryEpisodeLock(storeKey, { localOnly });
  if (!locked) return { episode: existing, skip: 'exists' };

  const transcript = await writeTwoHostScript(take, closed.fixtures);
  if (!transcript) return { episode: existing, skip: 'no_script' };
  const audio = await synthesizeTwoHost(transcript);
  if (!audio) return { episode: existing, skip: 'no_tts' };
  const stored = await storeAudio(storeKey, audio.bytes, audio.contentType, localOnly);
  if (!stored) return { episode: existing, skip: 'no_store' };
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
  await putStoredEpisode(episode, { localOnly });
  if (localOnly) await saveLocalEpisode(episode, audio.bytes).catch(() => {});
  return { episode };
}

/**
 * Zero-touch: if today's jornada slate is closed and Gemini is configured,
 * write one two-host episode. No-ops when live, already stored, or unconfigured.
 * `force` is local `next dev` only: memory cache, never Blob/KV.
 */
export async function maybeGenerateTomaEpisode(opts?: {
  force?: boolean;
}): Promise<TomaGenerateResult> {
  if (opts?.force && !deskDev()) return { episode: null, skip: 'force_prod' };
  if (!geminiTtsEnabled()) return { episode: null, skip: 'no_gemini' };

  const jornada = await getJornadaOverview().catch(() => null);
  if (!jornada) return { episode: null, skip: 'no_jornada' };
  const closed = opts?.force ? forceDaySlate(jornada) : closedDaySlate(jornada);
  if (!closed) return { episode: null, skip: 'not_closed' };

  const storeKey = episodeStoreKey(jornada.number, closed.dayKey);
  const pending = inflightEpisode(storeKey);
  if (pending) return { episode: await pending };

  const localOnly = Boolean(opts?.force);
  let result: TomaGenerateResult = { episode: null };
  await trackInflight(
    storeKey,
    (async () => {
      result = await runGenerate(jornada, closed, storeKey, localOnly);
      return result.episode;
    })()
  );
  return result;
}
