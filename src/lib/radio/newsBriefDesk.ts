import { anthropicEnabled, anthropicModel } from '@/lib/ai/anthropic';
import { sharedKvEnabled } from '@/lib/sharedKv';
import { elevenLabsConfigured, liveTtsEnabled, radioEnabled } from '@/lib/radio/tts';
import { generateBriefSlot, playableBriefSlot } from '@/lib/radio/voiceSchedule';

function blobEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim()
  );
}

/** Env + schedule gates for NEWS brief / cable play — for cron + ops. */
export function newsBriefDeskStatus(now = Date.now()) {
  const gen = generateBriefSlot(now);
  const play = playableBriefSlot(now);
  return {
    radioEnabled: radioEnabled(),
    anthropic: anthropicEnabled(),
    anthropicModel: anthropicModel(),
    elevenLabs: elevenLabsConfigured('caliente'),
    liveTts: liveTtsEnabled(),
    blob: blobEnabled(),
    sharedKv: sharedKvEnabled(),
    generateSlot: gen,
    playableSlot: play,
  };
}
