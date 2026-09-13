import { put } from '@vercel/blob';
import { setAudio } from '@/lib/radio/cache';
import { getJornadaOverview, type JornadaOverview } from '@/lib/sports/jornada';
import { getJornadaTakePayload } from '@/lib/sports/jornadaTakeAi';
import type { Fixture } from '@/lib/sports/types';
import {
  closedDaySlates,
  closedJornadaSlate,
  episodeBlobPath,
  episodeShowCopy,
  episodeStoreKey,
  forceDaySlate,
  getStoredEpisode,
  inflightEpisode,
  preJornadaSlate,
  putStoredEpisode,
  saveLocalEpisode,
  showKindFromDayKey,
  TOMA_VOICE_REV,
  trackInflight,
  tryEpisodeLock,
  type TomaEpisode,
  type TomaShowKind,
} from '@/lib/toma/episode';
import { elevenLabsConfigured, synthesizeBytes } from '@/lib/radio/tts';
import { sourceHash, writeTomaNarration } from '@/lib/toma/writeDialogue';

export type TomaGenerateSkip =
  | 'no_voice'
  | 'no_jornada'
  | 'not_closed'
  | 'force_prod'
  | 'no_take'
  | 'no_script'
  | 'no_tts'
  | 'no_store'
  | 'exists'
  | 'locked';

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
  if (!locked) return { episode: existing, skip: existing?.audioUrl ? 'exists' : 'locked' };

  const kind = showKindFromDayKey(closed.dayKey);
  const transcript = await writeTomaNarration(take, closed.fixtures, kind);
  if (!transcript) return { episode: existing, skip: 'no_script' };
  console.log('toma-tts', { id: storeKey, chars: transcript.length });
  const audio = await synthesizeBytes(transcript, 'caliente');
  if (!audio) return { episode: existing, skip: 'no_tts' };
  const stored = await storeAudio(storeKey, audio.bytes, audio.contentType, localOnly);
  if (!stored) return { episode: existing, skip: 'no_store' };
  const episode: TomaEpisode = {
    id: storeKey,
    jornadaNum: jornada.number,
    dayKey: closed.dayKey,
    kind,
    title: episodeShowCopy({ jornadaNum: jornada.number, dayKey: closed.dayKey, kind }).title,
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

async function runTracked(
  jornada: JornadaOverview,
  slate: { dayKey: string; fixtures: Fixture[] },
  localOnly: boolean
): Promise<TomaGenerateResult> {
  const storeKey = episodeStoreKey(jornada.number, slate.dayKey);
  const pending = inflightEpisode(storeKey);
  if (pending) return { episode: await pending };

  let result: TomaGenerateResult = { episode: null };
  await trackInflight(
    storeKey,
    (async () => {
      result = await runGenerate(jornada, slate, storeKey, localOnly);
      return result.episode;
    })()
  );
  return result;
}

function forceSlate(
  jornada: JornadaOverview,
  kind?: TomaShowKind
): { dayKey: string; fixtures: Fixture[] } {
  if (kind === 'antes') return { dayKey: 'antes', fixtures: [] };
  if (kind === 'cierre') return { dayKey: 'cierre', fixtures: jornada.played };
  return forceDaySlate(jornada);
}

/**
 * One TTS pass per call. Priority: cierre de fecha → missing settled day
 * (yesterday still counts) → latest day if hashes drifted → antes.
 * `force` is local `next dev` only: memory cache, never Blob/KV.
 */
export async function maybeGenerateTomaEpisode(opts?: {
  force?: boolean;
  kind?: TomaShowKind;
}): Promise<TomaGenerateResult> {
  if (opts?.force && !deskDev()) return { episode: null, skip: 'force_prod' };
  if (!elevenLabsConfigured()) return { episode: null, skip: 'no_voice' };

  const jornada = await getJornadaOverview().catch(() => null);
  if (!jornada) return { episode: null, skip: 'no_jornada' };

  const localOnly = Boolean(opts?.force);
  if (opts?.force) {
    return runTracked(jornada, forceSlate(jornada, opts.kind), localOnly);
  }

  const wrap = closedJornadaSlate(jornada);
  if (wrap) return runTracked(jornada, wrap, false);
  const days = closedDaySlates(jornada);
  if (days.length > 0) {
    for (const day of days) {
      const existing = await getStoredEpisode(jornada.number, day.dayKey);
      if (!existing?.audioUrl) return runTracked(jornada, day, false);
    }
    return runTracked(jornada, days[days.length - 1]!, false);
  }
  const pre = preJornadaSlate(jornada);
  if (pre) return runTracked(jornada, pre, false);
  return { episode: null, skip: 'not_closed' };
}
