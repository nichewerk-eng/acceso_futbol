import { getStoredBriefById, type NewsBriefEpisode } from '@/lib/radio/briefEpisode';
import { aggregateStories } from '@/lib/news/aggregate';
import { briefingStories } from '@/lib/radio/writeBriefNarration';
import type { CharAlignment } from '@/lib/toma/video/timing';
import type { TomaAlignment } from '@/lib/toma/video/types';
import { buildAlignment, estimateSpokenSeconds, resolveNewsVideoPlan, sampleNewsPlan } from './planScenes';
import { clubFromText, storyBeatsFromStories } from './storyAssets';
import { getNewsVideoRecord, putNewsVideoRecord } from './store';
import type { NewsStoryBeat, NewsVideoRecord } from './types';

export type BuildNewsVideoOpts = {
  episodeId: string;
  force?: boolean;
  absoluteAudioOrigin?: string;
  alignment?: CharAlignment | TomaAlignment | null;
  stories?: NewsStoryBeat[];
};

function asCharAlignment(
  a: CharAlignment | TomaAlignment | null | undefined
): CharAlignment | null {
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

async function loadStoryBeats(ep: NewsBriefEpisode): Promise<NewsStoryBeat[]> {
  if (ep.stories?.length) {
    return ep.stories.map((s) => ({
      ...s,
      team: clubFromText(`${s.title} ${s.summary ?? ''} ${s.accesoLine ?? ''}`),
    }));
  }
  try {
    const payload = await aggregateStories();
    return storyBeatsFromStories(briefingStories(payload.stories ?? []));
  } catch {
    return [];
  }
}

export async function buildNewsVideoPlan(opts: BuildNewsVideoOpts): Promise<NewsVideoRecord> {
  const existing = opts.force ? null : await getNewsVideoRecord(opts.episodeId);
  if (existing?.plan) return existing;

  const origin = opts.absoluteAudioOrigin?.replace(/\/$/, '') ?? '';

  if (opts.episodeId === 'news-brief-sample') {
    const plan = sampleNewsPlan(origin ? `${origin}/api/radio/brief-audio/news-brief-sample` : undefined);
    const rec = { episodeId: plan.episodeId, plan };
    await putNewsVideoRecord(rec);
    return rec;
  }

  const ep = await getStoredBriefById(opts.episodeId);
  if (!ep?.transcript) throw new Error('episode_not_found');

  const audioUrl = `/api/radio/brief-audio/${encodeURIComponent(ep.id)}`;
  const audioSrc = origin ? `${origin}${audioUrl}` : audioUrl;
  const stories = opts.stories?.length ? opts.stories : await loadStoryBeats(ep);

  const storedAlign =
    opts.alignment ??
    ((ep as { alignment?: CharAlignment | TomaAlignment }).alignment ?? null);
  const fallbackDur = estimateSpokenSeconds(ep.transcript);
  const alignment = buildAlignment(asCharAlignment(storedAlign), ep.transcript, fallbackDur);

  const plan = await resolveNewsVideoPlan({
    episodeId: ep.id,
    dayKey: ep.dayKey,
    slot: ep.slot,
    title: ep.title,
    transcript: ep.transcript,
    audioUrl,
    audioSrc,
    words: alignment.words,
    durationSeconds: alignment.durationSeconds,
    stories,
  });

  const rec: NewsVideoRecord = { episodeId: ep.id, plan };
  await putNewsVideoRecord(rec);
  return rec;
}
