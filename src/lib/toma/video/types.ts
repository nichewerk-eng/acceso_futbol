/** La Toma 9:16 video plan — graphics clocked to audio. */

export const TOMA_VIDEO_FPS = 30;
export const TOMA_VIDEO_WIDTH = 1080;
export const TOMA_VIDEO_HEIGHT = 1920;

export type WordTiming = {
  word: string;
  start: number;
  end: number;
};

export type TomaAlignment = {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
  words: WordTiming[];
  durationSeconds: number;
};

export type ClubRef = {
  id: string;
  name: string;
  abbr: string;
  logo: string;
};

export type SceneIntro = {
  type: 'intro';
  start: number;
  end: number;
  kicker?: string;
  title: string;
  subtitle?: string;
};

export type SceneTeamSpotlight = {
  type: 'teamSpotlight';
  start: number;
  end: number;
  team: ClubRef;
  headline: string;
  stats: { label: string; value: string }[];
};

export type SceneResultRow = {
  home: ClubRef;
  away: ClubRef;
  homeScore: number;
  awayScore: number;
};

export type SceneResults = {
  type: 'results';
  start: number;
  end: number;
  headline?: string;
  matches: SceneResultRow[];
};

export type SceneMatchCard = {
  type: 'matchCard';
  start: number;
  end: number;
  home: ClubRef;
  away: ClubRef;
  when: string;
  label?: string;
};

export type SceneStandingRow = {
  rank: number;
  team: ClubRef;
  pts: number;
  highlight?: boolean;
};

export type SceneStandings = {
  type: 'standings';
  start: number;
  end: number;
  headline?: string;
  rows: SceneStandingRow[];
};

export type SceneQuote = {
  type: 'quote';
  start: number;
  end: number;
  text: string;
  emphasis?: string[];
};

export type SceneOutro = {
  type: 'outro';
  start: number;
  end: number;
  line?: string;
};

export type SceneHeadline = {
  type: 'headline';
  start: number;
  end: number;
  kicker?: string;
  text: string;
};

export type TomaScene =
  | SceneIntro
  | SceneTeamSpotlight
  | SceneResults
  | SceneMatchCard
  | SceneStandings
  | SceneQuote
  | SceneOutro
  | SceneHeadline;

export type TomaVideoPlan = {
  version: 1;
  episodeId: string;
  jornadaNum: number;
  dayKey: string;
  title: string;
  format: '9:16';
  fps: number;
  width: number;
  height: number;
  durationSeconds: number;
  audioUrl: string;
  /** Absolute or site-relative path used by Remotion Player / renderer. */
  audioSrc: string;
  transcript: string;
  words: WordTiming[];
  scenes: TomaScene[];
  generatedAt: string;
  source: 'hand' | 'ai' | 'heuristic';
};

export type TomaVideoRecord = {
  episodeId: string;
  plan: TomaVideoPlan;
  /** Site path to MP4 when rendered, e.g. /api/toma/video/{id}/file */
  videoUrl?: string;
  blobPath?: string;
  renderedAt?: string;
  contentType?: string;
};
