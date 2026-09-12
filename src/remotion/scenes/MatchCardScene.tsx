import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import { clubColor } from '@/lib/toma/video/clubAssets';
import type { SceneMatchCard } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { Crest, SceneShell, useSceneEnter } from './SceneShell';

export function MatchCardScene({ scene }: { scene: SceneMatchCard }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const vs = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' });
  const homeColor = clubColor(scene.home.id);
  const awayColor = clubColor(scene.away.id);

  return (
    <SceneShell>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {scene.label ? (
          <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.2em', color: AF.orange, fontSize: 26 }}>
            {scene.label}
          </p>
        ) : null}
        <div
          style={{
            marginTop: 48,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: `linear-gradient(180deg, ${homeColor}55, transparent)`,
            }}
          >
            <Crest src={staticFile(scene.home.logo)} size={160} />
            <div style={{ marginTop: 24, fontSize: 48, textTransform: 'uppercase' }}>{scene.home.name}</div>
          </div>
          <div
            style={{
              opacity: vs,
              fontSize: 72,
              fontWeight: 700,
              color: AF.yellow,
              fontFamily: fontDisplay,
            }}
          >
            VS
          </div>
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              background: `linear-gradient(180deg, ${awayColor}55, transparent)`,
            }}
          >
            <Crest src={staticFile(scene.away.logo)} size={160} />
            <div style={{ marginTop: 24, fontSize: 48, textTransform: 'uppercase' }}>{scene.away.name}</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 64,
            alignSelf: 'center',
            padding: '18px 36px',
            border: `2px solid ${AF.line}`,
            fontFamily: fontMono,
            fontSize: 32,
            letterSpacing: '0.14em',
            color: AF.paper,
          }}
        >
          {scene.when}
        </div>
      </div>
    </SceneShell>
  );
}
