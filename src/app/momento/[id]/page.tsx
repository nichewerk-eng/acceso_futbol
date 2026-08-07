import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { SiteFooter } from '@/components/home/SiteFooter';
import { JsonLd } from '@/components/seo/JsonLd';
import { getClubIdentity } from '@/config/clubIdentity';
import { MOMENTS } from '@/config/moments';
import { siteConfig } from '@/config/site';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  newsArticleJsonLd,
} from '@/lib/seo';

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return MOMENTS.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = MOMENTS.find((x) => x.id === id);
  if (!m) return { title: 'Momento' };
  const path = `/momento/${m.id}`;
  const description = m.body.slice(0, 160);
  return {
    title: m.headline,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: m.headline,
      description,
      url: absoluteUrl(path),
      type: 'article',
      locale: 'es_MX',
      images: m.image ? [{ url: absoluteUrl(m.image) }] : undefined,
      publishedTime: m.publishedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: m.headline,
      description,
      images: m.image ? [absoluteUrl(m.image)] : undefined,
    },
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

  const clubs = (m.clubIds ?? [])
    .map((cid) => getClubIdentity(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const related = MOMENTS.filter(
    (x) =>
      x.id !== m.id &&
      ((m.clubIds?.length && x.clubIds?.some((c) => m.clubIds!.includes(c))) ||
        x.kind === m.kind)
  ).slice(0, 3);

  const path = `/momento/${m.id}`;

  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <JsonLd
        data={[
          newsArticleJsonLd({
            headline: m.headline,
            description: m.body,
            path,
            publishedAt: m.publishedAt,
            image: m.image,
            section: m.tag,
          }),
          breadcrumbJsonLd([
            { name: 'Pulso', path: '/' },
            { name: m.headline, path },
          ]),
        ]}
      />
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
            <Image
              src={m.image}
              alt={m.headline}
              fill
              className="object-cover"
              sizes="800px"
            />
          </div>
        )}
        <div className="mt-8 space-y-5">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-[17px] leading-8 text-muted">
              {p}
            </p>
          ))}
        </div>

        {clubs.length > 0 && (
          <nav className="mt-10 border-t border-white/[0.08] pt-6" aria-label="Clubs relacionados">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Sala del club
            </p>
            <ul className="mt-3 flex flex-wrap gap-3">
              {clubs.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/club/${c.id}`}
                    className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-signal hover:text-foreground"
                  >
                    {c.name} →
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {related.length > 0 && (
          <aside className="mt-10 border-t border-white/[0.08] pt-6" aria-label="Más momentos">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Más en Acceso
            </p>
            <ul className="mt-4 space-y-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/momento/${r.id}`}
                    className="group block"
                  >
                    <span className="font-display text-lg font-semibold uppercase leading-tight tracking-wide text-foreground group-hover:text-signal">
                      {r.headline}
                    </span>
                    <span className="mt-1 block text-sm text-muted">{r.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}

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
            href="/liga-mx"
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-signal"
          >
            Liga MX →
          </Link>
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
