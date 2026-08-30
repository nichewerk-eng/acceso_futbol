'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import { leaguePath } from '@/lib/radio/phases';
import type { Fixture, FixtureScorer } from '@/lib/sports/types';

const HOLD_MS = 4800;

function scoreN(score: string | null | undefined) {
  const n = Number(score);
  return Number.isFinite(n) ? n : 0;
}

function winnerOf(f: Fixture): 'home' | 'away' | null {
  if (f.winnerSide === 'home' || f.winnerSide === 'away') return f.winnerSide;
  const hs = scoreN(f.home.score);
  const as = scoreN(f.away.score);
  if (hs === as) return null;
  return hs > as ? 'home' : 'away';
}

function moodOf(f: Fixture): string | null {
  const hs = scoreN(f.home.score);
  const as = scoreN(f.away.score);
  const w = winnerOf(f);
  if (!w) return hs === 0 && as === 0 ? 'SIN GOLES' : 'EMPATE';
  if (Math.abs(hs - as) >= 3) return 'GOLEADA';
  return null;
}

function tone(winner: 'home' | 'away' | null, side: 'home' | 'away') {
  if (winner === side) return 'is-win';
  if (winner) return 'is-lose';
  return 'is-draw';
}

function ribbonText(f: Fixture) {
  return `${f.home.abbreviation} ${scoreN(f.home.score)}-${scoreN(f.away.score)} ${f.away.abbreviation}`;
}

function sideScorers(scorers: FixtureScorer[] | undefined, side: 'home' | 'away') {
  return (scorers ?? [])
    .filter((s) => s.side === side)
    .map((s) => `${s.name} ${s.minute}${s.pen ? ' (p)' : ''}${s.og ? ' (ag)' : ''}`)
    .join(' · ');
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

export function HeroTablero({
  played,
  jornadaNum,
}: {
  played: Fixture[];
  jornadaNum?: number | null;
}) {
  const reduce = usePrefersReducedMotion();
  const board = useMemo(
    () => [...played].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [played]
  );
  const ids = board.map((f) => f.id).join(',');
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const cycling = board.length > 1 && !reduce;

  useEffect(() => {
    setIndex(0);
  }, [ids]);

  useEffect(() => {
    if (!cycling || paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % board.length), HOLD_MS);
    return () => window.clearInterval(id);
  }, [cycling, paused, board.length]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (board.length === 0) return null;

  const featured = board[Math.min(index, board.length - 1)]!;
  const go = (dir: -1 | 1) => setIndex((i) => (i + dir + board.length) % board.length);

  return (
    <div
      className="hero-tablero af-ink"
      data-testid="hero-tablero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div className="hero-tablero-scan" aria-hidden />
      <div className="hero-tablero-sweep" aria-hidden />
      <div className="hero-tablero-inner">
        <div className="hero-tablero-ident">
          <p className="hero-tablero-call">
            <span className="text-signal">AF</span>
            ://TABLERO
          </p>
          <p className="hero-tablero-meta">
            {jornadaNum ? `Jornada ${jornadaNum}` : 'Fecha'}
            {` · ${board.length} sellado${board.length === 1 ? '' : 's'}`}
          </p>
          <a href="#jornada" className="hero-tablero-more">
            Recap →
          </a>
        </div>

        {reduce && board.length > 1 ? (
          <div className="hero-tablero-grid" data-testid="hero-tablero-grid">
            {board.map((f) => (
              <TableroMatch key={f.id} f={f} compact />
            ))}
          </div>
        ) : (
          <TableroMatch
            key={featured.id}
            f={featured}
            index={index}
            total={board.length}
          />
        )}

        {cycling ? (
          <div
            className="hero-tablero-dots"
            role="tablist"
            aria-label="Partidos sellados"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(1);
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(-1);
              }
            }}
          >
            {board.map((f, i) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${f.home.abbreviation} ${scoreN(f.home.score)} a ${scoreN(f.away.score)} ${f.away.abbreviation}`}
                className={['hero-tablero-dot', i === index ? 'is-on' : ''].join(' ')}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="hero-tablero-ribbon" aria-label="Cinta de marcadores">
        <div
          className={[
            'hero-tablero-track',
            reduce ? 'is-static' : 'ticker-scroll',
            paused && !reduce ? 'is-paused' : '',
          ].join(' ')}
        >
          {(reduce ? [0] : [0, 1]).map((copy) => (
            <p key={copy} className="hero-tablero-tape" aria-hidden={copy === 1}>
              {board.map((f) => (
                <span key={`${copy}-${f.id}`} className="hero-tablero-chip-wrap">
                  <Link href={`/partido/${leaguePath(f.league)}/${f.id}`} className="hero-tablero-chip">
                    <span className="hero-tablero-chip-ft">FT</span>
                    {ribbonText(f)}
                  </Link>
                  <span className="hero-tablero-sep" aria-hidden>
                    ◆
                  </span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableroMatch({
  f,
  compact,
  index,
  total,
}: {
  f: Fixture;
  compact?: boolean;
  index?: number;
  total?: number;
}) {
  const winner = winnerOf(f);
  const hs = scoreN(f.home.score);
  const as = scoreN(f.away.score);
  const mood = moodOf(f);
  const href = `/partido/${leaguePath(f.league)}/${f.id}`;
  const homeGoals = sideScorers(f.scorers, 'home');
  const awayGoals = sideScorers(f.scorers, 'away');

  return (
    <Link
      href={href}
      data-testid={compact ? `hero-tablero-cell-${f.id}` : 'hero-tablero-feature'}
      className={['hero-tablero-match', compact ? 'is-compact' : ''].join(' ')}
    >
      <div className="hero-tablero-match-rail">
        <span className="hero-tablero-stamp">FT</span>
        {mood ? <span className="hero-tablero-mood">{mood}</span> : null}
        {index != null && total != null && total > 1 ? (
          <span className="hero-tablero-index">
            {index + 1} / {total}
          </span>
        ) : null}
      </div>
      <div className="hero-tablero-board">
        <span className={['hero-tablero-club is-home', tone(winner, 'home')].join(' ')}>
          <ClubLogo
            abbr={f.home.abbreviation}
            clubId={f.home.id}
            name={f.home.name}
            logoUrl={f.home.logo}
            size={compact ? 'md' : 'xl'}
          />
          <span className="hero-tablero-abbr">{f.home.abbreviation}</span>
          <span className="hero-tablero-name">{f.home.name}</span>
          {homeGoals ? <span className="hero-tablero-goals">{homeGoals}</span> : null}
        </span>
        <p className="hero-tablero-score" aria-live="polite">
          <span className={tone(winner, 'home')}>{hs}</span>
          <span className="hero-tablero-dash">–</span>
          <span className={tone(winner, 'away')}>{as}</span>
        </p>
        <span className={['hero-tablero-club is-away', tone(winner, 'away')].join(' ')}>
          <ClubLogo
            abbr={f.away.abbreviation}
            clubId={f.away.id}
            name={f.away.name}
            logoUrl={f.away.logo}
            size={compact ? 'md' : 'xl'}
          />
          <span className="hero-tablero-abbr">{f.away.abbreviation}</span>
          <span className="hero-tablero-name">{f.away.name}</span>
          {awayGoals ? <span className="hero-tablero-goals">{awayGoals}</span> : null}
        </span>
      </div>
    </Link>
  );
}
