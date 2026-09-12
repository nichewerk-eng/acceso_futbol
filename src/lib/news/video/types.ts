/** AF://NEWS 9:16 video plan — graphics clocked to brief audio. */

import type { ClubRef, WordTiming } from '@/lib/toma/video/types';

export type { WordTiming, ClubRef };

export const NEWS_VIDEO_FPS = 30;
export const NEWS_VIDEO_WIDTH = 1080;
export const NEWS_VIDEO_HEIGHT = 1920;

export type NewsStoryBeat = {
  title: string;
  sourceLabel: string;
  summary?: string;
  accesoLine?: string;
  team?: ClubRef;
};

export type NewsSceneIntro = {
  type: 'intro';
  start: number;
  end: number;
  title: string;
  subtitle?: string;
};

export type NewsSceneStory = {
  type: 'story';
  start: number;
  end: number;
  index: number;
  title: string;
  sourceLabel: string;
  line?: string;
  team?: ClubRef;
};

export type NewsSceneTake = {
  type: 'take';
  start: number;
  end: number;
  text: string;
  emphasis?: string[];
};

export type NewsSceneHeadline = {
  type: 'headline';
  start: number;
  end: number;
  kicker?: string;
  text: string;
};

export type NewsSceneOutro = {
  type: 'outro';
  start: number;
  end: number;
  line?: string;
};

export type NewsScene =
  | NewsSceneIntro
  | NewsSceneStory
  | NewsSceneTake
  | NewsSceneHeadline
  | NewsSceneOutro;

export type NewsVideoPlan = {
  version: 1;
  episodeId: string;
  dayKey: string;
  slot: 'am' | 'pm';
  title: string;
  format: '9:16';
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  audioUrl: string;
  audioSrc: string;
  transcript: string;
  words: WordTiming[];
  stories: NewsStoryBeat[];
  scenes: NewsScene[];
  generatedAt: string;
  source: 'hand' | 'ai' | 'heuristic';
};

export type NewsVideoRecord = {
  episodeId: string;
  plan: NewsVideoPlan;
  videoUrl?: string;
  blobPath?: string;
  renderedAt?: string;
  contentType?: string;
};
