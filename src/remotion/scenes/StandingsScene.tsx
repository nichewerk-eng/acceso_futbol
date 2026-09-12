import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { SceneStandings } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { Crest, SceneShell, useSceneEnter } from './SceneShell';

export function StandingsScene({ scene }: { scene: SceneStandings }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);

  return (
    <SceneShell>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.18em', color: AF.orange, fontSize: 26 }}>
          TABLA
        </p>
        <h2 style={{ margin: '16px 0 40px', fontSize: 64, textTransform: 'uppercase', fontFamily: fontDisplay }}>
          {scene.headline ?? 'Corte Liguilla'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {scene.rows.map((row, i) => {
            const o = interpolate(frame, [6 + i * 7, 16 + i * 7], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={`${row.rank}-${row.team.id}`}
                style={{
                  opacity: o,
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 100px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '22px 20px',
                  background: row.highlight ? 'rgba(245,79,27,0.18)' : 'rgba(0,0,0,0.28)',
                  borderLeft: row.highlight ? `6px solid ${AF.orange}` : `6px solid ${AF.line}`,
                }}
              >
                <span style={{ fontFamily: fontMono, fontSize: 36, color: AF.dim }}>{row.rank}º</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                  <Crest src={staticFile(row.team.logo)} size={64} />
                  <span style={{ fontSize: 40, textTransform: 'uppercase' }}>{row.team.name}</span>
                </div>
                <span style={{ fontSize: 48, fontWeight: 700, textAlign: 'right', fontFamily: fontMono }}>
                  {row.pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
}
