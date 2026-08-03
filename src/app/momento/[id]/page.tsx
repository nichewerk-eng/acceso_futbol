import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { SiteFooter } from '@/components/home/SiteFooter';
import { MOMENTS } from '@/config/moments';
import { siteConfig } from '@/config/site';

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return MOMENTS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = MOMENTS.find((x) => x.id === id);
  if (!m) return { title: 'Momento' };
  return {
    title: m.headline,
    description: m.body,
  };
}

export default async function MomentoPage({ params }: Props) {
  const { id } = await params;
  const m = MOMENTS.find((x) => x.id === id);
  if (!m) notFound();

  const paragraphs = m.sections?.length ? m.sections : [m.body];
  const when = m.publishedAt
    ? new Date(m.publishedAt).toLocaleString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <PulseNav />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/#noticias"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-foreground"
        >
          ← Lo que prende
        </Link>
        {m.tag && (
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-signal">
            {m.tag}
            {when ? ` · ${when}` : ''}
          </p>
        )}
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-wide sm:text-5xl">
          {m.headline}
        </h1>
        {m.accesoLine && (
          <p className="mt-4 border-l-2 border-signal pl-3 text-base font-medium text-foreground">
            Acceso · {m.accesoLine}
          </p>
        )}
        {m.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-bg-2">
            <Image src={m.image} alt="" fill className="object-cover" sizes="800px" />
          </div>
        )}
        <div className="mt-8 space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[17px] leading-8 text-muted">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={siteConfig.tiktok.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="af-cta"
          >
            Ver el show en TikTok
          </a>
          <Link
            href="/#noticias"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-signal"
          >
            Volver al cable →
          </Link>
        </div>
        <div className="mt-10">
          <RitualSlot placement="moment" />
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
