import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { clipShareText } from '@/lib/share/recordingShare';
import { recordingOgTree, RECORDING_OG_SIZE } from '@/lib/share/recordingOg';
import { episodeShowCopy, getStoredEpisodeById } from '@/lib/toma/episode';

export const alt = 'AF://TOMA · Acceso Futbol';
export const size = RECORDING_OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export default async function OgImage({ params }: Props) {
  const { id } = await params;
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, ep] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    getStoredEpisodeById(decodeURIComponent(id)).catch(() => null),
  ]);

  const show = ep ? episodeShowCopy(ep) : null;
  const dek = ep
    ? clipShareText(ep.transcript, 180) || show?.cue || 'La toma de Acceso Futbol.'
    : 'La toma de Acceso Futbol.';

  return new ImageResponse(
    recordingOgTree({
      kicker: 'AF://TOMA',
      meta: ep ? `J${ep.jornadaNum}` : 'LIGA MX',
      title: show?.title ?? 'Toma de la jornada',
      dek,
    }),
    {
      ...size,
      fonts: [
        { name: 'AF Body', data: bodyRegular, style: 'normal', weight: 400 },
        { name: 'AF Display', data: oswaldBold, style: 'normal', weight: 700 },
      ],
    }
  );
}
