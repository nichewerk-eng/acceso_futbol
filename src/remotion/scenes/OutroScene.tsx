import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { SceneOutro } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

export function OutroScene({ scene }: { scene: SceneOutro }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const glow = interpolate(frame, [0, 30], [0.4, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneShell>
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
          width={220}
          height={220}
          style={{ width: 220, height: 220, objectFit: 'contain', opacity: glow }}
        />
        <p
          style={{
            marginTop: 48,
            fontFamily: fontMono,
            letterSpacing: '0.22em',
            color: AF.orange,
            fontSize: 28,
          }}
        >
          AF://TOMA
        </p>
        <h2
          style={{
            marginTop: 28,
            fontSize: 56,
            maxWidth: 860,
            lineHeight: 1.15,
            fontFamily: fontDisplay,
            textTransform: 'uppercase',
          }}
        >
          {scene.line ?? 'Esto fue La Toma de Acceso Futbol.'}
        </h2>
        <p style={{ marginTop: 40, fontSize: 32, color: AF.yellow }}>accesofutbol.com</p>
      </div>
    </SceneShell>
  );
}
