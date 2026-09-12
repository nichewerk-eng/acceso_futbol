import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import { NEWS_OUTRO } from '@/lib/radio/signOff';
import type { NewsSceneOutro } from '@/lib/news/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function NewsOutroScene({ scene }: { scene: NewsSceneOutro }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const glow = interpolate(frame, [0, 30], [0.4, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneShell product="news" rightLabel="NOTICIAS">
      <div
        style={{
          ...enter,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={staticFile('logo.png')}
          alt=""
          width={200}
          height={200}
          style={{ width: 200, height: 200, objectFit: 'contain', opacity: glow }}
        />
        <p
          style={{
            marginTop: 40,
            fontFamily: fontMono,
            letterSpacing: '0.22em',
            color: AF.orange,
            fontSize: 28,
          }}
        >
          AF://NEWS
        </p>
        <h2
          style={{
            marginTop: 28,
            fontSize: 52,
            maxWidth: 860,
            lineHeight: 1.15,
            fontFamily: fontDisplay,
            textTransform: 'uppercase',
          }}
        >
          {scene.line ?? NEWS_OUTRO}
        </h2>
        <p style={{ marginTop: 40, fontSize: 32, color: AF.yellow }}>accesofutbol.com</p>
      </div>
    </SceneShell>
  );
}
