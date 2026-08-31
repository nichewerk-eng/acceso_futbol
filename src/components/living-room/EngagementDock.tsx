'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { SelloShare } from '@/components/sello/SelloShare';
import { useGravity } from '@/contexts/GravityContext';
import { useGamesOfDay } from '@/lib/client/useGamesOfDay';
import { pickLeadMint } from '@/lib/sello/mint';
import { leaguePath, mexicoDayKey, shiftDayKey } from '@/lib/radio/phases';

function dockDayLabel(dayKey: string | undefined, upcoming: boolean, count: number) {
  const n = String(count).padStart(2, '0');
  if (!upcoming) return `HOY · ${n}`;
  const today = mexicoDayKey();
  if (dayKey && dayKey === shiftDayKey(today, 1)) return `MAÑANA · ${n}`;
  return `PRÓXIMO · ${n}`;
}

export function EngagementDock() {
  const { payload } = useGamesOfDay();
  const { clubId, elTri } = useGravity();
  const [on, setOn] = useState(false);

  const games = payload?.games ?? [];
  const game =
    games.find((g) => g.state === 'in') ??
    games.find((g) => g.phase === 'preshow') ??
    games.find((g) => g.state === 'pre') ??
    games[0] ??
    null;
  const sello = useMemo(
    () => pickLeadMint(games, { clubId, elTri }),
    [games, clubId, elTri]
  );
  const count = games.length;
  const upcoming = Boolean(payload?.upcoming);

  useEffect(() => {
    const onScroll = () => setOn(window.scrollY > 420 && Boolean(game));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [game]);

  if (!game) return null;

  const path = leaguePath(game.league);
  const href = `/partido/${path}/${game.id}`;
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
            ) : (
              dockDayLabel(payload?.dayKey, upcoming, count)
            )}
          </p>
          <p className="flex items-center gap-2 truncate text-[#f6f5f2]">
            <ClubLogo
              abbr={game.home.abbreviation}
              clubId={game.home.id}
              name={game.home.name}
              logoUrl={game.home.logo}
              size="sm"
            />
            <span className="club-word club-word-sm">{game.home.abbreviation}</span>
            <span className="mx-0.5 text-white/40">{score}</span>
            <span className="club-word club-word-sm">{game.away.abbreviation}</span>
            <ClubLogo
              abbr={game.away.abbreviation}
              clubId={game.away.id}
              name={game.away.name}
              logoUrl={game.away.logo}
              size="sm"
            />
          </p>
        </div>
        <Link href={href} className="hoy-cta shrink-0 !py-2" data-testid="dock-cta-ficha">
          Ficha
        </Link>
        {sello ? (
          <SelloShare
            mint={sello}
            className="hoy-cta hoy-cta-ghost shrink-0 !py-2"
            testId="dock-sello"
            label="Compartir"
          />
        ) : null}
        <Link
          href="/#jornada"
          className="hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 sm:inline"
          data-testid="dock-cta-all"
        >
          Jornada
        </Link>
      </div>
    </div>
  );
}
