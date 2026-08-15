'use client';

import Link from 'next/link';
import { PulseNav } from '@/components/living-room/PulseNav';
import { MatchXiShare } from '@/components/partido/MatchXiShare';
import { XiPitch } from '@/components/partido/XiPitch';
import { matchHasXi } from '@/lib/share/xiShare';
import type { MatchSnapshot } from '@/lib/sports/types';

export function XiPoster({
  match,
  league,
}: {
  match: MatchSnapshot;
  league: string;
}) {
  const has = matchHasXi(match);
  const href = `/partido/${league}/${match.id}?tab=alineacion`;

  return (
    <div className="flex min-h-screen flex-col bg-bg-1 text-foreground">
      <PulseNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="af-tele text-foreground">
          <span className="text-signal">AF</span>
          ://XI
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase tracking-wide sm:text-4xl">
              {match.home.abbreviation} vs {match.away.abbreviation}
            </h1>
            <p className="mt-2 font-mono text-[12px] text-muted">
              {match.jornada ? `${match.jornada} · ` : ''}
              {has ? 'XI confirmado' : 'Aún no confirman'}
            </p>
          </div>
          {has ? <MatchXiShare match={match} league={league} /> : null}
        </div>

        {has ? (
          <div className="xi-poster-grid mt-8">
            {(match.lineups ?? []).map((t) => (
              <XiPitch key={t.side} team={t} />
            ))}
          </div>
        ) : (
          <p className="mt-8 max-w-lg font-mono text-[13px] leading-6 text-muted">
            Las alineaciones salen cuando el club confirma. Entra al capítulo para el contexto y
            Dónde ver.
          </p>
        )}

        <Link
          href={href}
          className="mt-8 inline-block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-signal hover:text-foreground"
        >
          Abrir capítulo
        </Link>
      </main>
    </div>
  );
}
