import { put } from '@vercel/blob';
import { aggregateStories } from '@/lib/news/aggregate';
import {
  briefBlobPath,
  getStoredBrief,
  inflightBrief,
  putStoredBrief,
  trackBriefInflight,
  tryBriefLock,
  type NewsBriefEpisode,
} from '@/lib/radio/briefEpisode';
import { elevenLabsConfigured, synthesizeBytes } from '@/lib/radio/tts';
import {
  briefingStories,
  storiesSourceHash,
  writeNewsBriefNarration,
} from '@/lib/radio/writeBriefNarration';
import {
  briefDeskTitle,
  briefStoreKey,
  generateBriefSlot,
  playableBriefSlot,
} from '@/lib/radio/voiceSchedule';

export type BriefGenerateSkip =
  | 'no_voice'
  | 'off_window'
  | 'no_stories'
  | 'no_script'
  | 'no_tts'
  | 'no_store'
  | 'exists'
  | 'locked';

export type BriefGenerateResult = {
  episode: NewsBriefEpisode | null;
  skip?: BriefGenerateSkip;
};

function blobEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim()
  );
}

async function storeBriefAudio(
  id: string,
  bytes: Buffer,
  contentType: string
): Promise<{ audioUrl: string; blobPath?: string } | null> {
  if (!blobEnabled()) return null;
  try {
    const blobPath = briefBlobPath(id, contentType);
    await put(blobPath, bytes, {
      access: 'private',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: bytes.length > 4_000_000,
    });
    return {
      blobPath,
      audioUrl: `/api/radio/brief-audio/${encodeURIComponent(id)}`,
    };
  } catch {
    return null;
  }
}

/**
 * Stories on the NEWS rail → one spoken script → one ElevenLabs MP3.
 * Play is Blob-only.
 */
export async function maybeGenerateNewsBrief(opts?: {
  force?: boolean;
}): Promise<BriefGenerateResult> {
  if (!elevenLabsConfigured()) return { episode: null, skip: 'no_voice' };
  const slot = generateBriefSlot();
  if (!slot && !opts?.force) return { episode: null, skip: 'off_window' };
  const ref = slot ?? playableBriefSlot();
  const storeKey = briefStoreKey(ref.dayKey, ref.slot);

  const pending = inflightBrief(storeKey);
  if (pending) return { episode: await pending };

  let result: BriefGenerateResult = { episode: null };
  await trackBriefInflight(
    storeKey,
    (async () => {
      const payload = await aggregateStories().catch(() => null);
      const stories = briefingStories(payload?.stories ?? []);
      if (stories.length === 0) {
        result = { episode: null, skip: 'no_stories' };
        return null;
      }
      const hash = `${storiesSourceHash(stories)}-v2-signoff`;
      const existing = await getStoredBrief(ref.dayKey, ref.slot);
      if (existing?.audioUrl && existing.sourceHash === hash) {
        result = { episode: existing, skip: 'exists' };
        return existing;
      }
      const locked = await tryBriefLock(storeKey);
      if (!locked) {
        result = { episode: existing, skip: existing?.audioUrl ? 'exists' : 'locked' };
        return existing;
      }
      const transcript = await writeNewsBriefNarration(stories, ref.slot);
      if (!transcript) {
        result = { episode: existing, skip: 'no_script' };
        return existing;
      }
      console.log('news-brief-tts', { id: storeKey, chars: transcript.length, stories: stories.length });
      const audio = await synthesizeBytes(transcript, 'caliente');
      if (!audio) {
        result = { episode: existing, skip: 'no_tts' };
        return existing;
      }
      const stored = await storeBriefAudio(storeKey, audio.bytes, audio.contentType);
      if (!stored) {
        result = { episode: existing, skip: 'no_store' };
        return existing;
      }
      const episode: NewsBriefEpisode = {
        id: storeKey,
        dayKey: ref.dayKey,
        slot: ref.slot,
        title: briefDeskTitle(ref.slot),
        transcript,
        sourceHash: hash,
        audioUrl: stored.audioUrl,
        blobPath: stored.blobPath,
        contentType: audio.contentType,
        generatedAt: new Date().toISOString(),
        sources: [...new Set(stories.map((s) => s.sourceLabel))],
      };
      await putStoredBrief(episode);
      result = { episode };
      return episode;
    })()
  );
  return result;
}
