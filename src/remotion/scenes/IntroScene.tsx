import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { SceneIntro } from '@/lib/toma/video/types';
import { AF, fontDisplay } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function IntroScene({ scene }: { scene: SceneIntro }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const scale = interpolate(frame, [0, 20], [0.92, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <SceneShell>
      <div style={{ ...enter, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
        <h1
          style={{
            fontFamily: fontDisplay,
            fontSize: 140,
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            margin: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
          }}
        >
          {scene.title}
        </h1>
        {scene.subtitle ? (
          <p
            style={{
              marginTop: 36,
              fontSize: 40,
              color: AF.yellow,
              maxWidth: 900,
              lineHeight: 1.2,
            }}
          >
            {scene.subtitle}
          </p>
        ) : null}
      </div>
    </SceneShell>
  );
}
