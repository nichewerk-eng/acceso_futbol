import { ImageResponse } from 'next/og';
import { loadSelloFonts, selloCrestSrc } from '@/lib/sello/crest';
import { loadSelloFixture } from '@/lib/sello/load';
import { mintFromFixture } from '@/lib/sello/mint';
import { SELLO_CARD_SIZE, selloCardTree } from '@/lib/sello/og';
import { parseSelloClub } from '@/lib/sello/share';

export const revalidate = 15;

type Props = { params: Promise<{ league: string; id: string }> };

export async function GET(req: Request, { params }: Props) {
  const { league, id } = await params;
  const clubId = parseSelloClub(new URL(req.url).searchParams.get('club'));
  const [fonts, fixture] = await Promise.all([loadSelloFonts(), loadSelloFixture(league, id)]);
  if (!fixture) {
    return new Response('Not found', { status: 404 });
  }
  const mint = mintFromFixture(fixture, { clubId });
  const [home, away] = await Promise.all([
    selloCrestSrc(mint.home.abbreviation, mint.home.logo),
    selloCrestSrc(mint.away.abbreviation, mint.away.logo),
  ]);
  return new ImageResponse(selloCardTree(mint, { home, away }), {
    ...SELLO_CARD_SIZE,
    fonts,
    headers: {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
    },
  });
}
