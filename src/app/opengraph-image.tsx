import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Acceso Futbol · Liga MX, Leagues Cup y El Tri';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [logoBytes, oswaldBold, bodyRegular] = await Promise.all([
    readFile(join(process.cwd(), 'public/logo-dark.png')),
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
  ]);
  const logoSrc = `data:image/png;base64,${Buffer.from(logoBytes).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#f6f5f2',
          color: '#1e223d',
          fontFamily: 'AF Body',
          fontWeight: 400,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background:
              'radial-gradient(ellipse 80% 70% at 15% 20%, rgba(245,79,27,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 85%, rgba(245,79,27,0.10) 0%, transparent 50%), linear-gradient(145deg, #f6f5f2 0%, #eceae5 55%, #eceae5 100%)',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '56px 64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Body',
                fontSize: 22,
                letterSpacing: 5,
                fontWeight: 400,
                color: '#f54f1b',
              }}
            >
              AF://PULSO
            </div>
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Body',
                fontSize: 20,
                fontWeight: 400,
                color: '#666',
              }}
            >
              accesofutbol.com
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 48,
              width: '100%',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              width={340}
              height={220}
              alt=""
              style={{
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'AF Display',
                  fontSize: 72,
                  fontWeight: 700,
                  letterSpacing: -1,
                  lineHeight: 0.95,
                  textTransform: 'uppercase',
                }}
              >
                Acceso Futbol
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'AF Body',
                  fontWeight: 400,
                  fontSize: 22,
                  color: '#555',
                  lineHeight: 1.3,
                  letterSpacing: 1,
                  maxWidth: 640,
                }}
              >
                LIGA MX · LEAGUES CUP · EL TRI
              </div>
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'AF Body',
                  fontWeight: 400,
                  fontSize: 24,
                  color: '#f54f1b',
                  lineHeight: 1.25,
                }}
              >
                Donde vive el fútbol mexicano
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 6,
              background: '#f54f1b',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'AF Body',
          data: bodyRegular,
          style: 'normal',
          weight: 400,
        },
        {
          name: 'AF Display',
          data: oswaldBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}
