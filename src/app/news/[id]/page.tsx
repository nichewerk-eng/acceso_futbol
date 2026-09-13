import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RecordingListen } from '@/components/living-room/RecordingListen';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { getStoredBriefById } from '@/lib/radio/briefEpisode';
import { audioObjectJsonLd, absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';
import {
  clipShareText,
  newsShareCopy,
  newsSharePath,
  recordingFileName,
} from '@/lib/share/recordingShare';

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

async function loadBrief(raw: string) {
  const id = decodeURIComponent(raw);
  const ep = await getStoredBriefById(id);
  if (!ep?.audioUrl) return null;
  const path = newsSharePath(ep.id);
  const audioPath = `/api/radio/brief-audio/${encodeURIComponent(ep.id)}`;
  const copy = newsShareCopy({
    title: ep.title,
    slot: ep.slot,
    transcript: ep.transcript,
  });
  return { ep, path, audioPath, copy };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const loaded = await loadBrief(id);
  if (!loaded) return { title: 'NEWS' };
  const { copy, path, ep, audioPath } = loaded;
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

export default async function NewsListenPage({ params }: Props) {
  const { id } = await params;
  const loaded = await loadBrief(id);
  if (!loaded) notFound();
  const { ep, path, audioPath, copy } = loaded;
  const fileName = recordingFileName('news', ep.id, ep.contentType);
  const dek = clipShareText(ep.transcript, 180);

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          audioObjectJsonLd({
            name: copy.title,
            description: dek || copy.text,
            path,
            audioPath,
            datePublished: ep.generatedAt,
          }),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'NEWS', path: '/#noticias' },
            { name: ep.title, path },
          ]),
        ]}
      />
      <PulseNav />
      <main className="flex-1">
        <RecordingListen
          kicker="://NEWS"
          title={ep.title}
          dek={dek}
          audioUrl={audioPath}
          downloadUrl={`${audioPath}?download=1`}
          fileName={fileName}
          shareTitle={copy.title}
          shareText={copy.text}
          sharePath={path}
          transcript={ep.transcript}
          backHref="/#noticias"
          backLabel="Lo que prende"
        />
      </main>
      <SiteFooter />
    </div>
  );
}
