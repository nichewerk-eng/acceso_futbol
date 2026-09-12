import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { WordTiming } from '@/lib/toma/video/types';
import { AF, fontDisplay } from '../theme';

const WINDOW = 5;

export function Captions({ words }: { words: WordTiming[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (words.length === 0) return null;

  let active = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i]!.start <= t) active = i;
    else break;
  }

  const start = Math.max(0, active - 1);
  const slice = words.slice(start, start + WINDOW);
  if (slice.length === 0) return null;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 72,
        paddingLeft: 48,
        paddingRight: 48,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          textAlign: 'center',
          fontFamily: fontDisplay,
          fontSize: 42,
          lineHeight: 1.25,
          textTransform: 'uppercase',
          textShadow: '0 2px 18px rgba(0,0,0,0.75)',
        }}
      >
        {slice.map((w, i) => {
          const idx = start + i;
          const on = idx === active;
          return (
            <span
              key={`${w.start}-${idx}`}
              style={{
                color: on ? AF.orange : AF.paper,
                opacity: on ? 1 : 0.55,
                marginRight: 10,
                fontWeight: on ? 700 : 500,
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
