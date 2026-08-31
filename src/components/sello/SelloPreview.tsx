import type { CSSProperties } from 'react';
import { ClubLogo } from '@/components/brand/ClubLogo';
import type { SelloMint } from '@/lib/sello/types';

export function SelloPreview({ mint, compact = false }: { mint: SelloMint; compact?: boolean }) {
  const style = {
    '--sello-ink': mint.palette.ink,
    '--sello-signal': mint.palette.signal,
    '--sello-paper': mint.palette.onInk,
  } as CSSProperties;

  return (
    <article
      className={['sello-card', compact ? 'is-compact' : '', `is-${mint.kind}`].filter(Boolean).join(' ')}
      style={style}
      data-testid="sello-preview"
      data-sello-kind={mint.kind}
    >
      <div className="sello-card-rail" aria-hidden />
      <div className="sello-card-body">
        <div className="sello-card-top">
          <p className="sello-card-kicker">
            AF://SELLO
            {mint.jornada ? ` · ${mint.jornada}` : ''}
          </p>
          <p className="sello-card-stamp">{mint.stamp}</p>
        </div>

        <div className="sello-card-board">
          <span className="sello-card-club">
            <ClubLogo
              abbr={mint.home.abbreviation}
              clubId={mint.home.id}
              name={mint.home.name}
              logoUrl={mint.home.logo}
              size={compact ? 'sm' : 'md'}
            />
            <span>{mint.home.abbreviation}</span>
          </span>
          <p className="sello-card-score" aria-label={`${mint.home.score} a ${mint.away.score}`}>
            {mint.kind === 'pre' ? 'VS' : `${mint.home.score}–${mint.away.score}`}
          </p>
          <span className="sello-card-club is-away">
            <span>{mint.away.abbreviation}</span>
            <ClubLogo
              abbr={mint.away.abbreviation}
              clubId={mint.away.id}
              name={mint.away.name}
              logoUrl={mint.away.logo}
              size={compact ? 'sm' : 'md'}
            />
          </span>
        </div>

        {mint.scorer && !compact ? (
          <p className="sello-card-scorer">
            {mint.scorer.name}
            {mint.scorer.minute ? ` ${mint.scorer.minute}'` : ''}
            {mint.scorer.pen ? ' P' : ''}
            {mint.scorer.og ? ' OG' : ''}
          </p>
        ) : null}

        <h2 className="sello-card-headline">{mint.headline}</h2>
        <p className="sello-card-line">{mint.line}</p>
        {mint.dondeVer ? <p className="sello-card-dv">{mint.dondeVer}</p> : null}
      </div>
    </article>
  );
}
