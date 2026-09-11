'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { lookupKalshiMatchOdds, type KalshiMatchOdds } from '@/lib/kalshi/ligaMxGames';
import { useKalshiGamesBoard } from '@/lib/client/useKalshiGames';

export function KalshiMatchOddsLine({
  date,
  homeAbbr,
  awayAbbr,
  className = '',
  compact = false,
}: {
  date: string;
  homeAbbr: string;
  awayAbbr: string;
  className?: string;
  compact?: boolean;
}) {
  const board = useKalshiGamesBoard();
  const odds = lookupKalshiMatchOdds(board, date, homeAbbr, awayAbbr);
  if (!odds) return null;
  return (
    <KalshiMatchOddsView
      odds={odds}
      homeAbbr={homeAbbr}
      awayAbbr={awayAbbr}
      className={className}
      compact={compact}
    />
  );
}

export function KalshiMatchOddsView({
  odds,
  homeAbbr,
  awayAbbr,
  className = '',
  compact = false,
}: {
  odds: KalshiMatchOdds;
  homeAbbr: string;
  awayAbbr: string;
  className?: string;
  compact?: boolean;
}) {
  const openMarket = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(odds.href, '_blank', 'noopener,noreferrer');
  };

  const label = `${homeAbbr} ${odds.homePct} · Empate ${odds.drawPct} · ${awayAbbr} ${odds.awayPct}`;

  return (
    <span
      role="link"
      tabIndex={0}
      className={['kalshi-odds', compact ? 'is-compact' : '', className].filter(Boolean).join(' ')}
      data-testid="kalshi-match-odds"
      title={`${label} · probabilidad Kalshi`}
      aria-label={`${label}. Probabilidad implícita en Kalshi`}
      onClick={openMarket}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openMarket(e);
      }}
    >
      <span className="kalshi-odds-side" data-side="home">
        <span className="kalshi-odds-abbr">{homeAbbr}</span>
        <span className="kalshi-odds-pct">{odds.homePct}</span>
      </span>
      <span className="kalshi-odds-draw">
        <span className="kalshi-odds-abbr">Empate</span>
        <span className="kalshi-odds-pct">{odds.drawPct}</span>
      </span>
      <span className="kalshi-odds-side" data-side="away">
        <span className="kalshi-odds-abbr">{awayAbbr}</span>
        <span className="kalshi-odds-pct">{odds.awayPct}</span>
      </span>
    </span>
  );
}
