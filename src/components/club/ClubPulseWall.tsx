'use client';

import { useEffect, useState } from 'react';
import type { ClubPulseItem, ClubPulsePayload } from '@/lib/news/clubPulse';
import { useDeviceTimeZone } from '@/lib/client/useDeviceTimeZone';
import { formatKickoffLong } from '@/lib/localTime';

function when(iso: string | null, tz: string) {
  if (!iso) return '';
  return formatKickoffLong(iso, tz);
}

function kindClass(kind: ClubPulseItem['kind']) {
  if (kind === 'reddit') return 'is-reddit';
  if (kind === 'moment' || kind === 'blog') return 'is-acceso';
  if (kind === 'youtube' || kind === 'tiktok') return 'is-show';
  return 'is-cable';
}

export function ClubPulseWall({ clubId }: { clubId: string }) {
  const tz = useDeviceTimeZone();
  const [items, setItems] = useState<ClubPulseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    fetch(`/api/club/${clubId}/pulse`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ClubPulsePayload | null) => {
        if (!dead && data?.items) setItems(data.items);
      })
      .catch(() => {
        if (!dead) setItems([]);
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => {
      dead = true;
    };
  }, [clubId]);

  return (
    <section
      className="club-pulse border-b border-line px-4 py-10 sm:px-6"
      data-testid="club-pulse"
      id="pulso-club"
    >
      <div className="mx-auto max-w-6xl">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>://PULSO
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
          Lo que late
        </h2>
        <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-muted">
          News, Reddit y el show de Acceso — una sola pared, sin tabs.
        </p>

        {loading && (
          <p className="mt-8 af-tele text-muted" data-testid="club-pulse-loading">
            Sintonizando…
          </p>
        )}

        {!loading && items.length === 0 && (
          <p className="mt-8 max-w-md font-mono text-[13px] leading-6 text-muted">
            El feed está callado por ahora. Vuelve en la jornada — o abre TikTok @accesofutbolmx.
          </p>
        )}

        <ul className="club-pulse-list mt-8" data-testid="club-pulse-list">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={[
                'club-pulse-row',
                kindClass(item.kind),
                i < 6 ? 'animate-pulse-in' : '',
              ].join(' ')}
              style={i < 6 ? { animationDelay: `${i * 0.05}s` } : undefined}
            >
              <a
                href={item.url}
                target={item.url.startsWith('/') ? undefined : '_blank'}
                rel={item.url.startsWith('/') ? undefined : 'noopener noreferrer'}
                className="club-pulse-link"
                data-testid={`club-pulse-${item.kind}-${item.id}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="af-tele club-pulse-stamp">{item.stamp}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {item.sourceLabel}
                    {when(item.publishedAt, tz) ? ` · ${when(item.publishedAt, tz)}` : ''}
                  </span>
                </div>
                <p className="mt-2 font-display text-lg font-bold uppercase leading-tight tracking-wide sm:text-xl">
                  {item.title}
                </p>
                {(item.accesoLine || item.summary) && (
                  <p className="mt-2 font-mono text-[12px] leading-5 text-muted line-clamp-2">
                    {item.accesoLine || item.summary}
                  </p>
                )}
                {item.score != null && item.kind === 'reddit' && (
                  <p className="mt-2 font-mono text-[10px] text-signal">
                    ↑ {item.score} en la grada
                  </p>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
