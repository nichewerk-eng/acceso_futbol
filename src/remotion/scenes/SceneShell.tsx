import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { AF, fontDisplay, fontMono } from '../theme';

export function SceneShell({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  const frame = useCurrentFrame();
  const scan = interpolate(frame % 90, [0, 90], [0, 100]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: AF.blue,
        color: AF.paper,
        fontFamily: fontDisplay,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{
          background: `linear-gradient(160deg, ${AF.blue} 0%, #12152a 55%, ${AF.teal} 140%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(246,245,242,0.025) 3px, rgba(246,245,242,0.025) 4px)',
          opacity: 0.85,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${scan}%`,
          height: 2,
          background: accent ?? AF.orange,
          opacity: 0.25,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 48,
          left: 48,
          right: 48,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: fontMono,
          fontSize: 22,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: AF.dim,
        }}
      >
        <span>
          <span style={{ color: AF.orange }}>AF</span>
          ://TOMA
        </span>
        <span>LIGA MX</span>
      </div>
      <AbsoluteFill style={{ padding: '140px 56px 220px' }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

export function useSceneEnter(localFrame: number, dur = 12) {
  const opacity = interpolate(localFrame, [0, dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(localFrame, [0, dur], [36, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { opacity, transform: `translateY(${y}px)` };
}

export function Crest({ src, size = 120 }: { src: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
      }}
    />
  );
}
