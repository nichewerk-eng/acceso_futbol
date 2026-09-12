import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import { clubColor } from '@/lib/toma/video/clubAssets';
import type { SceneTeamSpotlight } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { Crest, SceneShell, useSceneEnter } from './SceneShell';

export function TeamSpotlightScene({ scene }: { scene: SceneTeamSpotlight }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const bar = interpolate(frame, [8, 28], [0, 100], { extrapolateRight: 'clamp' });
  const accent = clubColor(scene.team.id);

  return (
    <SceneShell accent={accent}>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            width: `${bar}%`,
            height: 8,
            background: accent,
            marginBottom: 40,
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <Crest src={staticFile(scene.team.logo)} size={180} />
          <div>
            <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.2em', color: AF.dim, fontSize: 24 }}>
              {scene.team.abbr}
            </p>
            <h2
              style={{
                margin: '8px 0 0',
                fontSize: 96,
                lineHeight: 0.95,
                textTransform: 'uppercase',
                fontFamily: fontDisplay,
              }}
            >
              {scene.team.name}
            </h2>
          </div>
        </div>
        <p style={{ marginTop: 40, fontSize: 48, color: AF.yellow, maxWidth: 920 }}>{scene.headline}</p>
        <div style={{ display: 'flex', gap: 24, marginTop: 56 }}>
          {scene.stats.map((s, i) => {
            const o = interpolate(frame, [12 + i * 6, 24 + i * 6], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={s.label}
                style={{
                  opacity: o,
                  flex: 1,
                  border: `2px solid ${AF.line}`,
                  padding: '28px 20px',
                  background: 'rgba(0,0,0,0.22)',
                }}
              >
                <div style={{ fontFamily: fontMono, fontSize: 22, letterSpacing: '0.16em', color: AF.dim }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 84, fontWeight: 700, marginTop: 8, color: AF.paper }}>{s.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
}
