import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { NewsSceneIntro } from '@/lib/news/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function NewsIntroScene({ scene }: { scene: NewsSceneIntro }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const scale = interpolate(frame, [0, 20], [0.92, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneShell product="news" rightLabel="NOTICIAS">
      <div
        style={{
          ...enter,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: fontMono,
            letterSpacing: '0.2em',
            color: AF.orange,
            fontSize: 26,
          }}
        >
          {scene.subtitle ?? 'AF://NEWS'}
        </p>
        <h1
          style={{
            fontFamily: fontDisplay,
            fontSize: 110,
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase',
            margin: '28px 0 0',
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
          }}
        >
          {scene.title}
        </h1>
      </div>
    </SceneShell>
  );
}
