import { ImageResponse } from 'next/og';
import { loadSelloFonts, selloCrestSrc } from '@/lib/sello/crest';
import { loadSelloFixture } from '@/lib/sello/load';
import { mintFromFixture } from '@/lib/sello/mint';
import { SELLO_OG_SIZE, selloOgTree } from '@/lib/sello/og';

export const alt = 'Acceso Futbol · sello';
export const size = SELLO_OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 30;

type Props = { params: Promise<{ league: string; id: string }> };

export default async function OgImage({ params }: Props) {
  const { league, id } = await params;
  const [fonts, fixture] = await Promise.all([loadSelloFonts(), loadSelloFixture(league, id)]);
  if (!fixture) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#1e223d', color: '#f54f1b', fontSize: 48, alignItems: 'center', justifyContent: 'center', fontFamily: 'AF Display' }}>
        AF://SELLO
      </div>,
      { ...size, fonts }
    );
  }
  const mint = mintFromFixture(fixture);
  const [home, away] = await Promise.all([
    selloCrestSrc(mint.home.abbreviation, mint.home.logo),
    selloCrestSrc(mint.away.abbreviation, mint.away.logo),
  ]);
  return new ImageResponse(selloOgTree(mint, { home, away }), { ...size, fonts });
}
