import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import type { SceneQuote } from '@/lib/toma/video/types';
import { AF, fontDisplay, fontMono } from '../theme';
import { SceneShell, useSceneEnter } from './SceneShell';

function renderEmphasized(text: string, emphasis: string[] = []) {
  if (emphasis.length === 0) return text;
  const pattern = new RegExp(`(${emphasis.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) => {
    const hit = emphasis.some((e) => e.toLowerCase() === part.toLowerCase());
    if (!hit) return <React.Fragment key={i}>{part}</React.Fragment>;
    return (
      <span key={i} style={{ color: AF.orange }}>
        {part}
      </span>
    );
  });
}

export function QuoteScene({ scene }: { scene: SceneQuote }) {
  const frame = useCurrentFrame();
  const enter = useSceneEnter(frame);
  const scale = interpolate(frame, [0, 18], [0.96, 1], { extrapolateRight: 'clamp' });

  return (
    <SceneShell>
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
          LA PREGUNTA QUE DIVIDE
        </p>
        <h2
          style={{
            margin: '36px 0 0',
            fontSize: 72,
            lineHeight: 1.12,
            fontFamily: fontDisplay,
            textTransform: 'uppercase',
            transform: `scale(${scale})`,
            transformOrigin: 'left center',
          }}
        >
          {renderEmphasized(scene.text, scene.emphasis)}
        </h2>
      </div>
    </SceneShell>
  );
}
