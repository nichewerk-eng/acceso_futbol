'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import type { KalshiChampionBoard } from '@/lib/kalshi/ligaMxChampion';
import { FRESH } from '@/lib/sports/freshness';

const GRID = 'lm-kalshi-grid';

function Board({ board }: { board: KalshiChampionBoard }) {
  return (
    <div data-testid="ligamx-kalshi-champion">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="af-tele text-foreground">
            <span className="text-signal">AF</span>
            ://MERCADO
          </p>
          <h3 className="mt-1 font-display text-xl font-bold uppercase tracking-wide sm:text-2xl">
            {board.label}
          </h3>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Probabilidad implícita en Kalshi (mercado de predicción). No es cuota de casa de
            apuestas.
          </p>
        </div>
        <a
          href={board.kalshiHref}
          target="_blank"
          rel="noopener noreferrer"
          className="af-tele text-signal transition hover:text-foreground"
        >
          Ver en Kalshi →
        </a>
      </div>

      <div className={`${GRID} border-b border-line pb-2 af-tele text-muted`}>
        <span className="text-center">#</span>
        <span>Club</span>
        <span className="text-right">Prob.</span>
        <span className="lm-col-desktop text-right">Mercado</span>
      </div>

      <ol className="list-none p-0">
        {board.rows.map((r) => (
          <li key={r.ticker}>
            <Link
              href={`/club/${r.clubId}`}
              className={[
                GRID,
                'border-t border-line py-3 transition hover:bg-bg-3',
                r.rank === 1 ? 'shadow-[inset_3px_0_0_var(--signal)]' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span
                className={[
                  'text-center font-display text-sm font-bold tabular-nums',
                  r.rank === 1 ? 'text-signal' : 'text-muted',
                ].join(' ')}
              >
                {r.rank}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <ClubLogo abbr={r.abbreviation} clubId={r.clubId} name={r.name} size="sm" />
                <span className="truncate font-display text-sm font-bold uppercase tracking-wide sm:text-base">
                  {r.name}
                </span>
              </span>
              <span className="text-right font-display text-sm font-bold tabular-nums sm:text-base">
                {r.pctLabel}
              </span>
              <span className="lm-col-desktop text-right af-tele text-muted">{r.ticker}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function KalshiChampionBoard({
  initial,
}: {
  initial?: KalshiChampionBoard | null;
}) {
  const [board, setBoard] = useState<KalshiChampionBoard | null>(initial ?? null);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch('/api/kalshi/liga-mx');
        if (!res.ok) return;
        const data = (await res.json()) as KalshiChampionBoard | { empty: true };
        if (stop || !data || 'empty' in data) return;
        setBoard(data);
      } catch {
        /* keep last */
      }
    };
    void load();
    const id = setInterval(load, FRESH.kalshiTtlMs);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (!board?.rows.length) return null;
  return <Board board={board} />;
}
