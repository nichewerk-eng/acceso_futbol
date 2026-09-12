import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import { clubColor } from '@/lib/toma/video/clubAssets';
import type { NewsSceneStory } from '@/lib/news/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { Crest, SceneShell, useSceneEnter } from './SceneShell';

export function NewsStoryScene({ scene }: { scene: NewsSceneStory }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const bar = interpolate(frame, [6, 24], [0, 100], { extrapolateRight: 'clamp' });
  const accent = scene.team ? clubColor(scene.team.id) : AF.orange;

  return (
    <SceneShell product="news" rightLabel="NOTICIAS" accent={accent}>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.18em', color: AF.orange, fontSize: 26 }}>
            NOTA {String(scene.index).padStart(2, '0')}
          </p>
          <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.14em', color: AF.dim, fontSize: 22 }}>
            {scene.sourceLabel}
          </p>
        </div>
        <div
          style={{
            width: `${bar}%`,
            height: 8,
            background: accent,
            marginTop: 28,
            marginBottom: 40,
          }}
        />
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          {scene.team ? <Crest src={staticFile(scene.team.logo)} size={120} /> : null}
          <h2
            style={{
              margin: 0,
              fontSize: 64,
              lineHeight: 1.08,
              textTransform: 'uppercase',
              fontFamily: fontDisplay,
              flex: 1,
            }}
          >
            {scene.title}
          </h2>
        </div>
        {scene.line ? (
          <p style={{ marginTop: 48, fontSize: 40, color: AF.yellow, lineHeight: 1.25, maxWidth: 920 }}>
            {scene.line}
          </p>
        ) : null}
      </div>
    </SceneShell>
  );
}
