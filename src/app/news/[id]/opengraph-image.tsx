import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getStoredBriefById } from '@/lib/radio/briefEpisode';
import { clipShareText } from '@/lib/share/recordingShare';
import { recordingOgTree, RECORDING_OG_SIZE } from '@/lib/share/recordingOg';

export const alt = 'AF://NEWS · Acceso Futbol';
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
    getStoredBriefById(decodeURIComponent(id)).catch(() => null),
  ]);

  const slot = ep?.slot === 'pm' ? 'Tarde' : 'Mañana';
  const dek = ep
    ? clipShareText(ep.transcript, 180) || 'Briefing de Liga MX.'
    : 'Briefing de Liga MX.';

  return new ImageResponse(
    recordingOgTree({
      kicker: 'AF://NEWS',
      meta: ep ? `${slot} · ${ep.dayKey}` : 'LIGA MX',
      title: ep?.title ?? 'Briefing de noticias',
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
