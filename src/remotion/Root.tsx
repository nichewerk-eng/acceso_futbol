import React from 'react';
import { Composition } from 'remotion';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPlex } from '@remotion/google-fonts/IBMPlexMono';
import { sampleNewsPlan } from '@/lib/news/video/planScenes';
import {
  NEWS_VIDEO_FPS,
  NEWS_VIDEO_HEIGHT,
  NEWS_VIDEO_WIDTH,
  type NewsVideoPlan,
} from '@/lib/news/video/types';
import { j8HandPlan } from '@/lib/toma/video/plans/j8-2026-09-11';
import {
  TOMA_VIDEO_FPS,
  TOMA_VIDEO_HEIGHT,
  TOMA_VIDEO_WIDTH,
  type TomaVideoPlan,
} from '@/lib/toma/video/types';
import { NewsVideo, type NewsVideoProps } from './NewsVideo';
import { TomaVideo, type TomaVideoProps } from './TomaVideo';

loadOswald('normal', {
  weights: ['500', '600', '700'],
  subsets: ['latin', 'latin-ext'],
});
loadPlex('normal', {
  weights: ['500', '600'],
  subsets: ['latin', 'latin-ext'],
});

const defaultToma = j8HandPlan();
const defaultNews = sampleNewsPlan();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TomaVideo"
        component={TomaVideo}
        durationInFrames={Math.round(defaultToma.durationSeconds * TOMA_VIDEO_FPS)}
        fps={TOMA_VIDEO_FPS}
        width={TOMA_VIDEO_WIDTH}
        height={TOMA_VIDEO_HEIGHT}
        defaultProps={{ plan: defaultToma } satisfies TomaVideoProps}
        calculateMetadata={async ({ props }) => {
          const plan = (props as TomaVideoProps).plan as TomaVideoPlan;
          return {
            durationInFrames: Math.max(1, Math.round(plan.durationSeconds * TOMA_VIDEO_FPS)),
            fps: plan.fps || TOMA_VIDEO_FPS,
            width: plan.width || TOMA_VIDEO_WIDTH,
            height: plan.height || TOMA_VIDEO_HEIGHT,
            props: { plan },
          };
        }}
      />
      <Composition
        id="NewsVideo"
        component={NewsVideo}
        durationInFrames={Math.round(defaultNews.durationSeconds * NEWS_VIDEO_FPS)}
        fps={NEWS_VIDEO_FPS}
        width={NEWS_VIDEO_WIDTH}
        height={NEWS_VIDEO_HEIGHT}
        defaultProps={{ plan: defaultNews } satisfies NewsVideoProps}
        calculateMetadata={async ({ props }) => {
          const plan = (props as NewsVideoProps).plan as NewsVideoPlan;
          return {
            durationInFrames: Math.max(1, Math.round(plan.durationSeconds * NEWS_VIDEO_FPS)),
            fps: plan.fps || NEWS_VIDEO_FPS,
            width: plan.width || NEWS_VIDEO_WIDTH,
            height: plan.height || NEWS_VIDEO_HEIGHT,
            props: { plan },
          };
        }}
      />
    </>
  );
};
