import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { SiteFooter } from '@/components/home/SiteFooter';
import { SelloPage } from '@/components/sello/SelloPage';
import { JsonLd } from '@/components/seo/JsonLd';
import { loadSelloFixture, selloLeague } from '@/lib/sello/load';
import { mintFromFixture } from '@/lib/sello/mint';
import { selloShareCopy } from '@/lib/sello/share';
import { absoluteUrl, breadcrumbJsonLd } from '@/lib/seo';

export const revalidate = 30;

type Props = { params: Promise<{ league: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { league, id } = await params;
  const path = `/sello/${league}/${id}`;
  const fixture = await loadSelloFixture(league, id);
  if (!fixture) return { title: 'Sello' };
  const mint = mintFromFixture(fixture);
  const copy = selloShareCopy(mint);
  return {
    title: copy.title,
    description: copy.text,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: copy.title,
      description: copy.text,
      url: absoluteUrl(path),
      type: 'website',
      locale: 'es_MX',
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.text,
    },
  };
}

export default async function SelloRoute({ params }: Props) {
  const { league, id } = await params;
  if (!selloLeague(league)) notFound();
  const fixture = await loadSelloFixture(league, id);
  if (!fixture) notFound();
  const mint = mintFromFixture(fixture);
  const path = mint.href;

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: 'Sello', path },
          ]),
        ]}
      />
      <PulseNav />
      <main className="flex-1">
        <SelloPage fixture={fixture} />
        <p className="mx-auto max-w-lg px-4 pb-10 text-center text-sm text-muted">
          <Link href={mint.partidoHref} className="text-signal hover:text-foreground">
            Abrir capítulo del partido
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
