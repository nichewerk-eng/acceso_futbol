import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { NewsScene, NewsVideoPlan } from '@/lib/news/video/types';
import { Captions } from './scenes/Captions';
import { HeadlineScene } from './scenes/HeadlineScene';
import { NewsIntroScene } from './scenes/NewsIntroScene';
import { NewsOutroScene } from './scenes/NewsOutroScene';
import { NewsStoryScene } from './scenes/NewsStoryScene';
import { NewsTakeScene } from './scenes/NewsTakeScene';

export type NewsVideoProps = {
  plan: NewsVideoPlan;
};

function SceneSwitch({ scene }: { scene: NewsScene }) {
  switch (scene.type) {
    case 'intro':
      return <NewsIntroScene scene={scene} />;
    case 'story':
      return <NewsStoryScene scene={scene} />;
    case 'take':
      return <NewsTakeScene scene={scene} />;
    case 'headline':
      return (
        <HeadlineScene
          product="news"
          scene={{
            type: 'headline',
            start: scene.start,
            end: scene.end,
            kicker: scene.kicker,
            text: scene.text,
          }}
        />
      );
    case 'outro':
      return <NewsOutroScene scene={scene} />;
    default:
      return null;
  }
}

function FadeBoundary({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(9, durationInFrames - 8), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export const NewsVideo: React.FC<NewsVideoProps> = ({ plan }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#1E223D' }}>
      {plan.audioSrc ? <Audio src={plan.audioSrc} /> : null}
      {plan.scenes.map((scene, i) => {
        const from = Math.round(scene.start * fps);
        const durationInFrames = Math.max(1, Math.round((scene.end - scene.start) * fps));
        return (
          <Sequence key={`${scene.type}-${i}-${scene.start}`} from={from} durationInFrames={durationInFrames}>
            <FadeBoundary>
              <SceneSwitch scene={scene} />
            </FadeBoundary>
          </Sequence>
        );
      })}
      <Captions words={plan.words ?? []} />
    </AbsoluteFill>
  );
};
