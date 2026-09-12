import { episodeShowCopy, getStoredEpisodeById, TOMA_VOICE_REV } from '@/lib/toma/episode';
import { resolveVideoPlan } from './planScenes';
import { j8HandPlan, J8_EPISODE_ID } from './plans/j8-2026-09-11';
import { putVideoRecord, getVideoRecord } from './store';
import { buildAlignment, estimateSpokenSeconds } from './timing';
import type { CharAlignment } from './timing';
import type { TomaAlignment, TomaVideoPlan, TomaVideoRecord } from './types';

export type BuildVideoOpts = {
  episodeId: string;
  /** Force rebuild even if a plan exists. */
  force?: boolean;
  /** Prefer the hand-authored J8 map when applicable. */
  preferHand?: boolean;
  absoluteAudioOrigin?: string;
  alignment?: CharAlignment | TomaAlignment | null;
};

function asCharAlignment(a: CharAlignment | TomaAlignment | null | undefined): CharAlignment | null {
  if (!a) return null;
  if ('character_start_times_seconds' in a && a.character_start_times_seconds) {
    return a as CharAlignment;
  }
  if ('characterStartTimesSeconds' in a && a.characterStartTimesSeconds) {
    return {
      characters: a.characters,
      character_start_times_seconds: a.characterStartTimesSeconds,
      character_end_times_seconds: a.characterEndTimesSeconds,
    };
  }
  return null;
}

export async function buildTomaVideoPlan(opts: BuildVideoOpts): Promise<TomaVideoRecord> {
  const existing = opts.force ? null : await getVideoRecord(opts.episodeId);
  if (existing?.plan) return existing;

  const ep = await getStoredEpisodeById(opts.episodeId);
  const origin = opts.absoluteAudioOrigin?.replace(/\/$/, '') ?? '';

  if (!ep && opts.episodeId === J8_EPISODE_ID) {
    const audioUrl = `/api/toma/audio/${encodeURIComponent(J8_EPISODE_ID)}?v=${encodeURIComponent(TOMA_VOICE_REV)}`;
    const plan = j8HandPlan(origin ? `${origin}${audioUrl}` : audioUrl);
    const rec: TomaVideoRecord = { episodeId: plan.episodeId, plan };
    await putVideoRecord(rec);
    return rec;
  }

  if (!ep?.transcript) {
    throw new Error('episode_not_found');
  }

  const show = episodeShowCopy(ep);
  const audioUrl = `/api/toma/audio/${encodeURIComponent(ep.id)}?v=${encodeURIComponent(TOMA_VOICE_REV)}`;
  const audioSrc = origin ? `${origin}${audioUrl}` : audioUrl;

  const storedAlign =
    opts.alignment ??
    ((ep as { alignment?: CharAlignment | TomaAlignment }).alignment ?? null);
  const fallbackDur = estimateSpokenSeconds(ep.transcript);
  const alignment = buildAlignment(asCharAlignment(storedAlign), ep.transcript, fallbackDur);

  const plan: TomaVideoPlan = await resolveVideoPlan({
    episodeId: ep.id,
    jornadaNum: ep.jornadaNum,
    dayKey: ep.dayKey,
    title: show.title,
    transcript: ep.transcript,
    audioUrl,
    audioSrc,
    words: alignment.words,
    durationSeconds: alignment.durationSeconds,
    preferHand: opts.preferHand,
  });

  const rec: TomaVideoRecord = { episodeId: ep.id, plan };
  await putVideoRecord(rec);
  return rec;
}
