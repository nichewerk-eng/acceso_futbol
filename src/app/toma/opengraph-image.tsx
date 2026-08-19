import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getJornadaTakePayload } from '@/lib/sports/jornadaTakeAi';

export const alt = 'Toma de la jornada · Acceso Futbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

export default async function OgImage() {
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, take] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    getJornadaTakePayload({ skipAi: true }).catch(() => null),
  ]);

  const kicker = take?.kicker ?? 'AF://TOMA';
  const headline = take?.headline ?? 'La toma llega con la fecha';
  const rawDek =
    take?.body?.[0] ??
    take?.dek ??
    'Cuando la jornada tenga partidos, Acceso escribe lo que importó.';
  const dek = rawDek.length > 180 ? `${rawDek.slice(0, 179).trim()}…` : rawDek;
  const beats = take?.beats.slice(0, 3) ?? [];

  return new ImageResponse(
    (
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
              {kicker}
            </div>
            <div style={{ display: 'flex', fontSize: 16, color: 'rgba(246,245,242,0.45)' }}>
              {take?.jornadaNum != null ? `J${take.jornadaNum}` : 'LIGA MX'}
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
              {dek}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
            {beats.map((b) => (
              <div
                key={b.id}
                style={{
                  display: 'flex',
                  fontSize: 16,
                  color: 'rgba(246,245,242,0.5)',
                }}
              >
                {b.kicker} — {b.line}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'AF Body', data: bodyRegular, style: 'normal', weight: 400 },
        { name: 'AF Display', data: oswaldBold, style: 'normal', weight: 700 },
      ],
    }
  );
}
