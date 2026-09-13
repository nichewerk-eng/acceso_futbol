import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RecordingListen } from '@/components/living-room/RecordingListen';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { audioObjectJsonLd, absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import {
  clipShareText,
  recordingFileName,
  tomaShareCopy,
  tomaSharePath,
} from '@/lib/share/recordingShare';
import { episodeShowCopy, getStoredEpisodeById, TOMA_VOICE_REV } from '@/lib/toma/episode';

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

async function loadEpisode(raw: string) {
  const id = decodeURIComponent(raw);
  const ep = await getStoredEpisodeById(id);
  if (!ep?.audioUrl) return null;
  const show = episodeShowCopy(ep);
  const path = tomaSharePath(ep.id);
  const audioPath = `/api/toma/audio/${encodeURIComponent(ep.id)}?v=${encodeURIComponent(TOMA_VOICE_REV)}`;
  const copy = tomaShareCopy({
    title: show.title,
    cue: show.cue,
    jornadaNum: ep.jornadaNum,
    transcript: ep.transcript,
  });
  return { ep, show, path, audioPath, copy };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadEpisode(id);
  if (!loaded) return { title: 'Toma' };
  const { show, path, copy, ep, audioPath } = loaded;
  const description = copy.text;
  return {
    title: copy.title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: copy.title,
      description,
      url: absoluteUrl(path),
      type: 'website',
      locale: 'es_MX',
      audio: [{ url: absoluteUrl(audioPath), type: ep.contentType || 'audio/mpeg' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description,
    },
  };
}

export default async function TomaListenPage({ params }: Props) {
  const { id } = await params;
  const loaded = await loadEpisode(id);
  if (!loaded) notFound();
  const { ep, show, path, audioPath, copy } = loaded;
  const fileName = recordingFileName('toma', ep.id, ep.contentType);
  const dek = clipShareText(ep.transcript, 180) || show.cue;

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          audioObjectJsonLd({
            name: copy.title,
            description: dek,
            path,
            audioPath,
            datePublished: ep.generatedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Toma', path: '/toma' },
            { name: show.title, path },
          ]),
        ]}
      />
      <PulseNav />
      <main className="flex-1">
        <RecordingListen
          kicker="://TOMA"
          title={show.title}
          dek={dek}
          audioUrl={audioPath}
          downloadUrl={`${audioPath}${audioPath.includes('?') ? '&' : '?'}download=1`}
          fileName={fileName}
          shareTitle={copy.title}
          shareText={copy.text}
          sharePath={path}
          transcript={ep.transcript}
          backHref="/toma"
          backLabel="Toma de la jornada"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
