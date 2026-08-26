'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { formatKickoffLong } from '@/lib/localTime';
import type { Story } from '@/lib/news/types';
import { CableBriefPlayer } from './CableBriefPlayer';

function timeLabel(iso: string | null, tz: string) {
  if (!iso) return '';
  return formatKickoffLong(iso, tz);
}

export function StoriesRail() {
  const tz = useDeviceTimeZone();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stories')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stories?: Story[] } | null) => {
        if (!cancelled) {
          setStories(d?.stories ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lead =
    stories.find((s) => s.sourceId === 'espn' && s.image) ??
    stories.find((s) => s.sourceId === 'espn') ??
    stories.find((s) => s.sourceId !== 'acceso' && s.image) ??
    stories.find((s) => s.sourceId !== 'acceso') ??
    stories.find((s) => s.sourceId === 'acceso' && s.image) ??
    stories.find((s) => s.sourceId === 'acceso') ??
    null;
  const rest = lead ? stories.filter((s) => s.id !== lead.id) : stories;
  const isInternal = (url: string) => url.startsWith('/');

  return (
    <section
      id="noticias"
      data-testid="section-cable"
      className="border-b border-line bg-bg-1 px-4 py-12 sm:px-6 sm:py-14"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="af-tele text-foreground">
              <span className="text-signal">AF</span>
              ://NEWS
            </p>
            <h2
              className="mt-2 font-display text-3xl font-bold uppercase tracking-wide text-foreground sm:text-4xl"
              data-testid="cable-title"
            >
              Lo que prende
            </h2>
          </div>
          <p className="af-tele">ACCESO · ESPN · MT · TUDN · MARCA</p>
        </div>

        <CableBriefPlayer />

        {loading && (
          <p className="af-tele py-8" data-testid="cable-loading">
            Trayendo las noticias…
          </p>
        )}

        {!loading && stories.length === 0 && (
          <p className="af-tele py-8" data-testid="cable-empty">
            Sin notas por ahora. Vuelve en unos minutos.
          </p>
        )}

        {lead && (
          <a
            href={lead.url}
            {...(isInternal(lead.url)
              ? {}
              : { target: '_blank', rel: 'noopener noreferrer' })}
            data-testid={`cable-headline-${lead.id}`}
            className="group mb-2 grid gap-6 border border-line bg-bg-2 lg:grid-cols-[1.05fr_0.95fr]"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-bg-3 lg:aspect-auto lg:min-h-[320px]">
              {lead.image ? (
                <Image
                  src={lead.image}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 640px"
                  referrerPolicy="no-referrer"
                  unoptimized={/espncdn|akamaized\.net|mediotiempo\.com|uvnimg\.com|uecdn\.es/i.test(
                    lead.image
                  )}
                />
              ) : (
                <div className="flex h-full min-h-[220px] items-center justify-center af-tele">
                  {lead.sourceLabel}
                </div>
              )}
              <span className="absolute left-3 top-3 af-chip border-0 bg-foreground text-bg-1">
                {lead.sourceId === 'acceso' ? 'ACCESO' : 'HEADLINE'}
              </span>
            </div>
            <div className="flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8">
              <p className="af-tele text-signal">
                {lead.sourceLabel}
                {lead.publishedAt ? ` · ${timeLabel(lead.publishedAt, tz)}` : ''}
              </p>
              <h3 className="mt-3 font-display text-2xl font-bold uppercase leading-[1.02] tracking-wide text-foreground transition group-hover:text-signal sm:text-4xl">
                {lead.title}
              </h3>
              {lead.summary && (
                <p className="mt-4 text-sm leading-6 text-muted line-clamp-3">{lead.summary}</p>
              )}
              {lead.accesoLine && (
                <p className="mt-4 border-l-2 border-signal pl-3 text-sm font-medium text-foreground">
                  Acceso · {lead.accesoLine}
                </p>
              )}
              <span className="mt-6 af-tele text-foreground group-hover:text-signal">
                {lead.sourceId === 'acceso'
                  ? 'Leer en Acceso →'
                  : `Leer en ${lead.sourceLabel} →`}
              </span>
            </div>
          </a>
        )}

        {rest.length > 0 && (
          <div className="mt-2" data-testid="cable-list">
            {rest.slice(0, 8).map((s, i) => (
              <a
                key={s.id}
                href={s.url}
                {...(isInternal(s.url)
                  ? {}
                  : { target: '_blank', rel: 'noopener noreferrer' })}
                data-testid={`cable-story-${s.id}`}
                className="af-story-row"
              >
                <span className="af-story-idx">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-foreground sm:text-xl">
                    {s.title}
                  </h3>
                  {(s.summary || s.accesoLine) && (
                    <p className="mt-1 truncate text-sm text-muted">
                      {s.summary || `Acceso · ${s.accesoLine}`}
                    </p>
                  )}
                </div>
                <span className="af-tele shrink-0 text-right">{s.sourceLabel}</span>
              </a>
            ))}
          </div>
        )}

        <p className="mt-6 af-tele">
          News primero (ESPN · MT · TUDN · Marca). Acceso abajo con atribución — tocan la fuente.
        </p>
      </div>
    </section>
  );
}
