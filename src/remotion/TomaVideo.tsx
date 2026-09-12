import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { TomaScene, TomaVideoPlan, WordTiming } from '@/lib/toma/video/types';
import { Captions } from './scenes/Captions';
import { HeadlineScene } from './scenes/HeadlineScene';
import { IntroScene } from './scenes/IntroScene';
import { MatchCardScene } from './scenes/MatchCardScene';
import { OutroScene } from './scenes/OutroScene';
import { QuoteScene } from './scenes/QuoteScene';
import { ResultsScene } from './scenes/ResultsScene';
import { StandingsScene } from './scenes/StandingsScene';
import { TeamSpotlightScene } from './scenes/TeamSpotlightScene';

export type TomaVideoProps = {
  plan: TomaVideoPlan;
};

function SceneSwitch({ scene }: { scene: TomaScene }) {
  switch (scene.type) {
    case 'intro':
      return <IntroScene scene={scene} />;
    case 'teamSpotlight':
      return <TeamSpotlightScene scene={scene} />;
    case 'results':
      return <ResultsScene scene={scene} />;
    case 'matchCard':
      return <MatchCardScene scene={scene} />;
    case 'standings':
      return <StandingsScene scene={scene} />;
    case 'quote':
      return <QuoteScene scene={scene} />;
    case 'outro':
      return <OutroScene scene={scene} />;
    case 'headline':
      return <HeadlineScene scene={scene} />;
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

export const TomaVideo: React.FC<TomaVideoProps> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const words: WordTiming[] = plan.words ?? [];

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
      <Captions words={words} />
    </AbsoluteFill>
  );
};
