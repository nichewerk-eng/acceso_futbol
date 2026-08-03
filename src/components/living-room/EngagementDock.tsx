'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { leaguePath } from '@/lib/radio/phases';

export function EngagementDock() {
  const { payload } = useGamesOfDay();
  const [on, setOn] = useState(false);

  const games = payload?.games ?? [];
  const game =
    games.find((g) => g.state === 'in') ??
    games.find((g) => g.phase === 'preshow') ??
    games.find((g) => g.state === 'pre') ??
    games[0] ??
    null;
  const count = games.length;

  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > 420 && Boolean(game));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [game]);

  if (!game) return null;

  const path = leaguePath(game.league);
  const href = `/partido/${path}/${game.id}`;
  const radioHref = `${href}?tab=radio`;
  const live = game.state === 'in';
  const score =
    game.state !== 'pre'
      ? `${game.home.score ?? 0}:${game.away.score ?? 0}`
      : 'VS';

  return (
    <div
      data-testid="dock-engagement"
      data-dock-on={on ? 'true' : 'false'}
      className={['af-dock', on ? 'is-on' : ''].join(' ')}
      role="complementary"
      aria-label="Acceso rápido"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1" data-testid="dock-match">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">
            {live ? (
              <span className="inline-flex items-center gap-2 text-signal">
                <span className="hoy-live-dot" aria-hidden />
                LIVE
              </span>
            ) : game.phase === 'preshow' ? (
              <span className="text-signal">PRE-SHOW</span>
            ) : (
              `HOY · ${String(count).padStart(2, '0')}`
            )}
          </p>
          <p className="flex items-center gap-2 truncate font-display text-lg font-bold uppercase tracking-wide text-[#f6f5f2]">
            <ClubLogo abbr={game.home.abbreviation} name={game.home.name} size="sm" />
            {game.home.abbreviation}
            <span className="mx-0.5 text-white/40">{score}</span>
            {game.away.abbreviation}
            <ClubLogo abbr={game.away.abbreviation} name={game.away.name} size="sm" />
          </p>
        </div>
        {game.radioAvailable ? (
          <Link href={radioHref} className="hoy-cta shrink-0 !py-2" data-testid="dock-cta-radio">
            {game.phase === 'live' ? 'Radio' : game.phase === 'preshow' ? 'Pre' : 'Recap'}
          </Link>
        ) : (
          <Link href={href} className="hoy-cta hoy-cta-ghost shrink-0 !py-2" data-testid="dock-cta-ficha">
            Ficha
          </Link>
        )}
        <Link
          href="/#hoy"
          className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 sm:inline"
          data-testid="dock-cta-all"
        >
          Todos
        </Link>
      </div>
    </div>
  );
}
