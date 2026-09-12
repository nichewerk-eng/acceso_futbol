import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { SceneHeadline } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function HeadlineScene({ scene }: { scene: SceneHeadline }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);

  return (
    <SceneShell>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {scene.kicker ? (
          <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.18em', color: AF.orange, fontSize: 26 }}>
            {scene.kicker}
          </p>
        ) : null}
        <h2
          style={{
            margin: '24px 0 0',
            fontSize: 88,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            fontFamily: fontDisplay,
          }}
        >
          {scene.text}
        </h2>
      </div>
    </SceneShell>
  );
}
