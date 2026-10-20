import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const mediaKitShareSize = { width: 1200, height: 630 };

export async function mediaKitShareImage(english: boolean) {
  const [logo, portrait, displayFont, bodyFont] = await Promise.all([
    readFile(join(process.cwd(), 'public/logo-dark.png')),
    // A crop of the existing AF editorial screenshot public/jonathang.jpg.
    // Source pixels: left 160, top 320, width 1000, height 840; no AI imagery.
    readFile(join(process.cwd(), 'public/mediakit/editorial-share.jpg')),
    readFile(join(process.cwd(), 'public/fonts/Oswald-Bold.woff')),
    readFile(join(process.cwd(), 'public/fonts/NotoSans-Regular.woff')),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
  const portraitSrc = `data:image/jpeg;base64,${portrait.toString('base64')}`;

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: '#101113', color: '#ffffff', fontFamily: 'AF Body' }}>
      {/* Real AF editorial imagery; no invented events, endorsements or results. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={portraitSrc} alt="" width={660} height={630} style={{ position: 'absolute', right: 0, top: 0, objectFit: 'cover' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(90deg, #101113 0%, #101113 38%, rgba(16,17,19,0.87) 49%, rgba(16,17,19,0.12) 70%, rgba(16,17,19,0.08) 100%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(0deg, #101113 0%, rgba(16,17,19,0.78) 12%, transparent 35%)' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 12, background: '#f54f1b', display: 'flex' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '40px 56px 30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ fontFamily: 'AF Display', fontWeight: 700, fontSize: 34, letterSpacing: 1 }}>ACCESO FUTBOL</div>
          <div style={{ width: 2, height: 28, background: '#f54f1b', display: 'flex' }} />
          <div style={{ fontSize: 21, letterSpacing: 2, color: '#e1e1e1' }}>{english ? 'FOR BRANDS' : 'PARA MARCAS'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, fontFamily: 'AF Display', fontWeight: 700, fontSize: 156, lineHeight: 0.95, letterSpacing: -2 }}>
          <div>MEDIA</div>
          <div style={{ color: '#f54f1b' }}>KIT</div>
        </div>
        <div style={{ display: 'flex', marginTop: 18, fontSize: 30, color: '#ffffff' }}>{english ? 'Your brand. Our fans.' : 'Tu marca. Nuestra afición.'}</div>
        <div style={{ display: 'flex', marginTop: 'auto', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ display: 'flex', width: 124, height: 82, alignItems: 'center', justifyContent: 'center', background: '#f6f5f2', borderRadius: 4 }}>
              {/* The AF logo is preserved, used as a signature rather than the cover. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt="" width={108} height={70} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 24 }}>
              <div>Liga MX · El Tri</div>
              <div style={{ color: '#d4d4d4', fontSize: 22 }}>{english ? 'Mexico + U.S.' : 'México + EE. UU.'}</div>
            </div>
          </div>
          <div style={{ fontSize: 22, color: '#ffffff', alignSelf: 'flex-end', paddingBottom: 5 }}>accesofutbol.com/mediakit</div>
        </div>
      </div>
    </div>,
    {
      ...mediaKitShareSize,
      fonts: [
        { name: 'AF Display', data: displayFont, weight: 700, style: 'normal' },
        { name: 'AF Body', data: bodyFont, weight: 400, style: 'normal' },
      ],
      headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' },
    },
  );
}
