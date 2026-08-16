import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { dondeVerGuideRows, dondeVerShareCopy } from '@/lib/share/dondeVerShare';
import { getJornadaOverview } from '@/lib/sports/jornada';
import type { Fixture } from '@/lib/sports';

export const alt = 'Dónde ver Liga MX · Acceso Futbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

function shortChannels(raw?: string, confirmed?: boolean): string {
  if (!confirmed || !raw || raw === 'Por confirmar') return 'Por confirmar';
  const parts = raw.split(' · ').filter(Boolean);
  if (parts.length <= 2) return parts.join(' · ');
  return `${parts.slice(0, 2).join(' · ')} +`;
}

function rowLabel(f: Fixture): { pair: string; mx: string; us: string } {
  return {
    pair: `${f.home.abbreviation} vs ${f.away.abbreviation}`,
    mx: shortChannels(f.dondeVer?.mx, f.dondeVer?.confirmed),
    us: shortChannels(f.dondeVer?.us, f.dondeVer?.confirmed),
  };
}

export default async function OgImage() {
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, overview] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    getJornadaOverview().catch(() => null),
  ]);

  const rows = overview
    ? dondeVerGuideRows(overview.live, overview.upcoming, overview.played).slice(0, 8)
    : [];
  const copy = dondeVerShareCopy(rows, overview?.number);
  const kicker = overview?.number
    ? `AF://DONDE-VER · JORNADA ${overview.number}`
    : 'AF://DONDE-VER';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0c0c0c',
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
              alignItems: 'center',
              width: '100%',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                letterSpacing: 4,
                color: '#e05a0c',
              }}
            >
              {kicker}
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(246,245,242,0.45)' }}>
              MX ↔ US
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: 'AF Display',
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginTop: 18,
              marginBottom: 12,
            }}
          >
            {copy.title}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              flex: 1,
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {rows.length === 0 ? (
              <div style={{ display: 'flex', fontSize: 28, color: 'rgba(246,245,242,0.55)' }}>
                Guía de transmisión Liga MX
              </div>
            ) : (
              rows.map((f) => {
                const r = rowLabel(f);
                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: 'AF Display',
                        fontSize: 26,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                        width: 220,
                      }}
                    >
                      {r.pair}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flex: 1,
                        fontSize: 20,
                        color: 'rgba(246,245,242,0.62)',
                      }}
                    >
                      MX {r.mx}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flex: 1,
                        fontSize: 20,
                        color: 'rgba(246,245,242,0.62)',
                      }}
                    >
                      US {r.us}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 14 }}>
            <div style={{ display: 'flex', width: '100%', height: 6, background: '#e05a0c' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontSize: 20,
                color: 'rgba(246,245,242,0.55)',
              }}
            >
              <div style={{ display: 'flex' }}>Tu acceso al fútbol mexicano.</div>
              <div style={{ display: 'flex' }}>accesofutbol.com/donde-ver</div>
            </div>
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
