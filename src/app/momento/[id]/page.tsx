import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PulseNav } from '@/components/living-room/PulseNav';
import { RitualSlot } from '@/components/ritual/RitualSlot';
import { SiteFooter } from '@/components/home/SiteFooter';
import { MOMENTS } from '@/config/moments';

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

  return (
    <div className="min-h-screen bg-bg-1 text-foreground">
      <PulseNav />
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/#momentos"
          className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-foreground"
        >
          ← Momentos
        </Link>
        {m.tag && (
          <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-signal">
            {m.tag}
          </p>
        )}
        <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-[1.05] tracking-wide sm:text-5xl">
          {m.headline}
        </h1>
        {m.image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden bg-bg-2">
            <Image src={m.image} alt="" fill className="object-cover" sizes="800px" />
          </div>
        )}
        <p className="mt-8 text-[17px] leading-8 text-muted">{m.body}</p>
        <div className="mt-10">
          <RitualSlot placement="moment" />
        </div>
        {m.href && (
          <Link
            href={m.href}
            className="mt-8 inline-flex text-[11px] font-semibold uppercase tracking-[0.18em] text-signal"
          >
            Continuar →
          </Link>
        )}
      </article>
      <SiteFooter />
    </div>
  );
}
