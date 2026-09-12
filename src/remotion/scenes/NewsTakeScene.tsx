import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { NewsSceneTake } from '@/lib/news/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function NewsTakeScene({ scene }: { scene: NewsSceneTake }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const scale = interpolate(frame, [0, 18], [0.96, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneShell product="news" rightLabel="NOTICIAS">
      <div
        style={{
          ...enter,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.18em', color: AF.orange, fontSize: 26 }}>
          TOMA ACCESO
        </p>
        <h2
          style={{
            margin: '36px 0 0',
            fontSize: 68,
            lineHeight: 1.12,
            fontFamily: fontDisplay,
            textTransform: 'uppercase',
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
          }}
        >
          {scene.text}
        </h2>
      </div>
    </SceneShell>
  );
}
