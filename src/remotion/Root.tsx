import React from 'react';
import { Composition } from 'remotion';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPlex } from '@remotion/google-fonts/IBMPlexMono';
import { j8HandPlan } from '@/lib/toma/video/plans/j8-2026-09-11';
import {
  TOMA_VIDEO_FPS,
  TOMA_VIDEO_HEIGHT,
  TOMA_VIDEO_WIDTH,
  type TomaVideoPlan,
} from '@/lib/toma/video/types';
import { TomaVideo, type TomaVideoProps } from './TomaVideo';

loadOswald('normal', {
  weights: ['500', '600', '700'],
  subsets: ['latin', 'latin-ext'],
});
loadPlex('normal', {
  weights: ['500', '600'],
  subsets: ['latin', 'latin-ext'],
});

const defaultPlan = j8HandPlan();

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TomaVideo"
        component={TomaVideo}
        durationInFrames={Math.round(defaultPlan.durationSeconds * TOMA_VIDEO_FPS)}
        fps={TOMA_VIDEO_FPS}
        width={TOMA_VIDEO_WIDTH}
        height={TOMA_VIDEO_HEIGHT}
        defaultProps={{ plan: defaultPlan } satisfies TomaVideoProps}
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
    </>
  );
};
