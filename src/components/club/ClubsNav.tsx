'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { EL_TRI, LIGA_MX_CLUBS } from '@/config/clubs';

type Props = {
  activeSlug?: string;
  className?: string;
  title?: string;
  dek?: string | null;
};

const MOBILE_MQ = '(max-width: 639px)';
/** Triple the strip so we can jump between identical sets without a hard edge. */
const LOOP_COPIES = 3;
const LOOP_MID = 1;

function centerChild(pad: HTMLElement, el: HTMLElement) {
  const left = el.offsetLeft - (pad.clientWidth - el.offsetWidth) / 2;
  pad.scrollTo({ left: Math.max(0, left), behavior: 'instant' });
}

function setStride(pad: HTMLElement): number {
  const a = pad.querySelector<HTMLElement>('[data-loop="0"]');
  const b = pad.querySelector<HTMLElement>('[data-loop="1"]');
  if (!a || !b) return 0;
  return b.offsetLeft - a.offsetLeft;
}

function nearestClubId(pad: HTMLElement): string | null {
  const mid = pad.scrollLeft + pad.clientWidth / 2;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const el of pad.querySelectorAll<HTMLElement>('[data-club-id]')) {
    const center = el.offsetLeft + el.offsetWidth / 2;
    const dist = Math.abs(center - mid);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = el.getAttribute('data-club-id');
    }
  }
  return bestId;
}

function pickClubEl(pad: HTMLElement, clubId: string): HTMLElement | null {
  return (
    pad.querySelector<HTMLElement>(`[data-loop="${LOOP_MID}"][data-club-id="${clubId}"]`) ??
    pad.querySelector<HTMLElement>(`[data-club-id="${clubId}"]`)
  );
}

/** Directory of Liga MX salas + El Tri. Browse-only — does not claim gravity. */
export function ClubsNav({
  activeSlug,
  className = '',
  title = 'Salas',
  dek = 'Partidos, pulso y cobertura de cada club de Liga MX y El Tri.',
}: Props) {
  const clubs = [EL_TRI, ...LIGA_MX_CLUBS];
  const padRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef(activeSlug ?? clubs[0]?.id ?? 'el-tri');
  const [focusId, setFocusId] = useState(focusRef.current);
  /** false until mounted — desktop SSR/grid first, carousel only after mobile MQ matches */
  const [carousel, setCarousel] = useState(false);
  const focus = clubs.find((c) => c.id === focusId) ?? clubs[0];

  const loopClubs = carousel
    ? Array.from({ length: LOOP_COPIES }, (_, loop) =>
        clubs.map((c) => ({ club: c, loop, key: `${loop}-${c.id}` }))
      ).flat()
    : clubs.map((c) => ({ club: c, loop: LOOP_MID, key: c.id }));

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setCarousel(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!carousel || !activeSlug) return;
    focusRef.current = activeSlug;
    setFocusId(activeSlug);
    const pad = padRef.current;
    const el = pad ? pickClubEl(pad, activeSlug) : null;
    if (pad && el) centerChild(pad, el);
  }, [activeSlug, carousel]);

  useEffect(() => {
    if (!carousel) return;
    const pad = padRef.current;
    if (!pad) return;

    const startId = activeSlug ?? clubs[0]?.id;
    const start = startId ? pickClubEl(pad, startId) : null;
    if (start) centerChild(pad, start);

    let raf = 0;
    let dragging = false;
    let settleTimer = 0;

    /** Only teleport at the real scroll ends — never mid-strip (that fights the finger). */
    const wrapAtEdges = () => {
      const stride = setStride(pad);
      if (stride <= 0) return;
      const max = pad.scrollWidth - pad.clientWidth;
      if (max <= stride) return;
      const edge = Math.min(48, stride * 0.08);
      if (pad.scrollLeft <= edge) {
        pad.scrollLeft += stride;
      } else if (pad.scrollLeft >= max - edge) {
        pad.scrollLeft -= stride;
      }
    };

    const syncFocus = () => {
      const next = nearestClubId(pad);
      if (!next || next === focusRef.current) return;
      focusRef.current = next;
      setFocusId(next);
    };

    const onScroll = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          syncFocus();
        });
      }
      if (dragging) return;
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        wrapAtEdges();
        syncFocus();
      }, 60);
    };

    const onScrollEnd = () => {
      window.clearTimeout(settleTimer);
      wrapAtEdges();
      syncFocus();
    };

    const onTouchStart = () => {
      dragging = true;
      window.clearTimeout(settleTimer);
    };

    const onTouchEnd = () => {
      dragging = false;
      // Let snap settle, then wrap if we landed near an edge.
      settleTimer = window.setTimeout(() => {
        wrapAtEdges();
        syncFocus();
      }, 40);
    };

    pad.addEventListener('scroll', onScroll, { passive: true });
    pad.addEventListener('scrollend', onScrollEnd);
    pad.addEventListener('touchstart', onTouchStart, { passive: true });
    pad.addEventListener('touchend', onTouchEnd, { passive: true });
    pad.addEventListener('touchcancel', onTouchEnd, { passive: true });
    syncFocus();
    return () => {
      pad.removeEventListener('scroll', onScroll);
      pad.removeEventListener('scrollend', onScrollEnd);
      pad.removeEventListener('touchstart', onTouchStart);
      pad.removeEventListener('touchend', onTouchEnd);
      pad.removeEventListener('touchcancel', onTouchEnd);
      window.clearTimeout(settleTimer);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm when carousel mode toggles
  }, [carousel]);

  return (
    <section
      id="clubes"
      className={['clubs-nav', carousel ? 'is-carousel' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-testid="clubs-nav"
      aria-label="Salas de club"
    >
      <p className="af-tele text-foreground">
        <span className="text-signal">AF</span>
        ://CLUBES
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
        {title}
      </h2>
      {dek ? (
        <p className="mt-2 max-w-lg font-mono text-[12px] leading-6 text-muted">{dek}</p>
      ) : null}

      {carousel ? (
        <p className="clubs-nav-focus" data-testid="clubs-nav-focus" aria-live="polite">
          <span className="clubs-nav-focus-name">{focus?.name}</span>
          <span className="clubs-nav-focus-hint">Desliza · toca para abrir</span>
        </p>
      ) : null}

      <div
        ref={padRef}
        className={[
          'af-club-pad',
          'clubs-nav-pad',
          'mt-6',
          carousel ? 'clubs-nav-pad--carousel' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-testid="clubs-nav-pad"
      >
        {loopClubs.map(({ club: c, loop, key }) => {
          const active = activeSlug === c.id;
          const focused = carousel && focusId === c.id;
          const primary = !carousel || loop === LOOP_MID;
          return (
            <Link
              key={key}
              href={`/club/${c.id}`}
              data-testid={primary ? `clubs-nav-${c.id}` : undefined}
              data-club-id={c.id}
              data-loop={carousel ? String(loop) : undefined}
              className={[
                'af-club-btn',
                active ? 'is-on' : '',
                focused ? 'is-focus' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={active && primary ? 'page' : undefined}
              aria-label={c.name}
              title={c.name}
            >
              <ClubLogo
                clubId={c.id}
                abbr={c.abbreviation}
                name={c.name}
                size="xs"
                className="clubs-nav-crest"
              />
            </Link>
          );
        })}      </div>
    </section>
  );
}
