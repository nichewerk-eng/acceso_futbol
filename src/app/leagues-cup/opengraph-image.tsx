import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Leagues Cup 2026 · MLS × Liga MX · Acceso Futbol';
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
          background: 'linear-gradient(145deg, #f6f5f2 0%, #e8e4dc 100%)',
          color: '#111',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 6, fontWeight: 700, color: '#e05a0c' }}>
          AF://LEAGUES CUP
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2, textTransform: 'uppercase', lineHeight: 1.05 }}>
            MLS × Liga MX
          </div>
          <div style={{ fontSize: 34, color: '#444', maxWidth: 900 }}>
            Calendario MX, dónde ver y cabina Acceso
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#666' }}>accesofutbol.com/leagues-cup</div>
      </div>
    ),
    { ...size }
  );
}
