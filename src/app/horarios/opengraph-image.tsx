import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Horarios Liga MX Apertura 2026 · Acceso Futbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(145deg, #f6f5f2 0%, #eceae5 100%)',
          color: '#1e223d',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            letterSpacing: 6,
            fontWeight: 700,
            color: '#f54f1b',
          }}
        >
          AF://HORARIOS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: -2,
              textTransform: 'uppercase',
              lineHeight: 1.05,
            }}
          >
            Horarios Liga MX
          </div>
          <div style={{ fontSize: 32, color: '#444' }}>
            Apertura 2026 · Hora CDMX · Calendario
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#666' }}>
          accesofutbol.com/horarios
        </div>
      </div>
    ),
    { ...size }
  );
}
