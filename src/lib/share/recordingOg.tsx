import type { ReactElement } from 'react';

export const RECORDING_OG_SIZE = { width: 1200, height: 630 };

export function recordingOgTree(opts: {
  kicker: string;
  meta: string;
  title: string;
  dek: string;
}): ReactElement {
  const headline = opts.title;
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#1e223d',
        color: '#f6f5f2',
        fontFamily: 'AF Body',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '44px 52px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 4, color: '#f54f1b' }}>
            {opts.kicker}
          </div>
          <div style={{ display: 'flex', fontSize: 16, color: 'rgba(246,245,242,0.45)' }}>
            {opts.meta}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'AF Display',
              fontSize: headline.length > 42 ? 48 : 58,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              lineHeight: 1.02,
              maxWidth: 1040,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 18,
              fontSize: 22,
              lineHeight: 1.4,
              color: 'rgba(246,245,242,0.62)',
              maxWidth: 920,
            }}
          >
            {opts.dek}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 16,
            letterSpacing: 3,
            color: 'rgba(246,245,242,0.45)',
          }}
        >
          ACCESO FUTBOL · ESCUCHAR
        </div>
      </div>
    </div>
  );
}
