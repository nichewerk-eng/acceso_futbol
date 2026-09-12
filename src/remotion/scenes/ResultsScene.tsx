import React from 'react';
import { interpolate, staticFile, useCurrentFrame } from 'remotion';
import type { SceneResults } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { Crest, SceneShell, useSceneEnter } from './SceneShell';

export function ResultsScene({ scene }: { scene: SceneResults }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);

  return (
    <SceneShell>
      <div style={{ ...enter, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <p style={{ margin: 0, fontFamily: fontMono, letterSpacing: '0.18em', color: AF.orange, fontSize: 26 }}>
          RESULTADOS
        </p>
        <h2 style={{ margin: '16px 0 48px', fontSize: 64, textTransform: 'uppercase', fontFamily: fontDisplay }}>
          {scene.headline ?? 'Lo que quedó sellado'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, flex: 1, justifyContent: 'center' }}>
          {scene.matches.map((m, i) => {
            const o = interpolate(frame, [8 + i * 10, 20 + i * 10], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const x = interpolate(frame, [8 + i * 10, 20 + i * 10], [40, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            return (
              <div
                key={`${m.home.id}-${m.away.id}`}
                style={{
                  opacity: o,
                  transform: `translateX(${x}px)`,
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: 20,
                  padding: '28px 24px',
                  background: 'rgba(0,0,0,0.28)',
                  borderLeft: `6px solid ${AF.orange}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 36, textAlign: 'right' }}>{m.home.abbr}</span>
                  <Crest src={staticFile(m.home.logo)} size={72} />
                </div>
                <div
                  style={{
                    fontSize: 64,
                    fontWeight: 700,
                    fontFamily: fontMono,
                    letterSpacing: '-0.04em',
                    minWidth: 160,
                    textAlign: 'center',
                  }}
                >
                  {m.homeScore}–{m.awayScore}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Crest src={staticFile(m.away.logo)} size={72} />
                  <span style={{ fontSize: 36 }}>{m.away.abbr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
}
