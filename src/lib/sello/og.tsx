import type { ReactElement } from 'react';
import type { SelloMint } from './types';

export const SELLO_OG_SIZE = { width: 1200, height: 630 };
export const SELLO_CARD_SIZE = { width: 1080, height: 1920 };

type Crests = { home: string | null; away: string | null };

function jornadaChip(jornada?: string | null): string | null {
  if (!jornada) return null;
  const j = jornada.match(/jornada\s*(\d+)/i);
  if (j) return `J${j[1]}`;
  return jornada.length > 18 ? jornada.slice(0, 16) : jornada;
}

function teamBlock(
  abbr: string,
  crest: string | null,
  size: number,
  color: string
): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: size + 80 }}>
      {crest ? (
        <img src={crest} width={size} height={size} alt="" style={{ objectFit: 'contain' }} />
      ) : (
        <div
          style={{
            display: 'flex',
            fontFamily: 'AF Display',
            fontSize: Math.round(size * 0.42),
            fontWeight: 700,
            color,
          }}
        >
          {abbr}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          marginTop: 14,
          fontFamily: 'AF Display',
          fontSize: Math.round(size * 0.28),
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color,
        }}
      >
        {abbr}
      </div>
    </div>
  );
}

export function selloOgTree(mint: SelloMint, crests: Crests): ReactElement {
  const ink = mint.palette.ink;
  const signal = mint.palette.signal;
  const paper = mint.palette.onInk;
  const round = jornadaChip(mint.jornada);
  const kicker = ['AF://SELLO', round].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: ink,
        color: paper,
        fontFamily: 'AF Body',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '44px 52px 40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', fontSize: 20, letterSpacing: 4, color: signal }}>
            {kicker}
          </div>
          <div style={{ display: 'flex', fontSize: 22, fontFamily: 'AF Display', color: signal }}>
            {mint.stamp}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {teamBlock(mint.home.abbreviation, crests.home, 120, paper)}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: 280,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Display',
                fontSize: mint.kind === 'pre' ? 64 : 88,
                fontWeight: 700,
                letterSpacing: -2,
                lineHeight: 1,
              }}
            >
              {mint.kind === 'pre' ? 'VS' : `${mint.home.score}–${mint.away.score}`}
            </div>
          </div>
          {teamBlock(mint.away.abbreviation, crests.away, 120, paper)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'AF Display',
              fontSize: mint.headline.length > 36 ? 36 : 44,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              maxWidth: 1100,
            }}
          >
            {mint.headline}
          </div>
          <div style={{ display: 'flex', width: '100%', height: 6, background: signal }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: 20,
              color: 'rgba(246,245,242,0.55)',
            }}
          >
            <div style={{ display: 'flex', maxWidth: 820 }}>{mint.line}</div>
            <div style={{ display: 'flex' }}>accesofutbol.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function selloCardTree(mint: SelloMint, crests: Crests): ReactElement {
  const ink = mint.palette.ink;
  const signal = mint.palette.signal;
  const paper = mint.palette.onInk;
  const round = jornadaChip(mint.jornada);
  const kicker = ['AF://SELLO', round].filter(Boolean).join(' · ');
  const score = mint.kind === 'pre' ? 'VS' : `${mint.home.score}–${mint.away.score}`;
  const scorer = mint.scorer
    ? `${mint.scorer.name}${mint.scorer.minute ? ` ${mint.scorer.minute}'` : ''}${mint.scorer.pen ? ' P' : ''}${mint.scorer.og ? ' OG' : ''}`
    : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: ink,
        color: paper,
        fontFamily: 'AF Body',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 18,
          height: '100%',
          background: signal,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 1062,
          height: '100%',
          padding: '72px 56px 64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', fontSize: 24, letterSpacing: 5, color: signal }}>
            {kicker}
          </div>
          {mint.kind === 'gol' || mint.kind === 'final' ? (
            <div style={{ display: 'flex' }} />
          ) : (
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Display',
                fontSize: 28,
                letterSpacing: 3,
                color: signal,
              }}
            >
              {mint.stamp}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 36 }}>
          {mint.kind === 'gol' || mint.kind === 'final' ? (
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Display',
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: 4,
                color: signal,
              }}
            >
              {mint.stamp}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            {teamBlock(mint.home.abbreviation, crests.home, 168, paper)}
            <div
              style={{
                display: 'flex',
                fontFamily: 'AF Display',
                fontSize: mint.kind === 'pre' ? 92 : 120,
                fontWeight: 700,
                letterSpacing: -3,
                lineHeight: 1,
              }}
            >
              {score}
            </div>
            {teamBlock(mint.away.abbreviation, crests.away, 168, paper)}
          </div>

          {scorer ? (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                letterSpacing: 1,
                color: 'rgba(246,245,242,0.55)',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {scorer}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'AF Display',
              fontSize: mint.headline.length > 28 ? 52 : 64,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            {mint.headline}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.35,
              color: 'rgba(246,245,242,0.7)',
              maxWidth: 900,
            }}
          >
            {mint.line}
          </div>
          {mint.dondeVer ? (
            <div style={{ display: 'flex', fontSize: 22, color: signal, letterSpacing: 1 }}>
              {mint.dondeVer}
            </div>
          ) : null}
          <div style={{ display: 'flex', width: '100%', height: 8, background: signal }} />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              fontSize: 22,
              letterSpacing: 2,
              color: 'rgba(246,245,242,0.45)',
            }}
          >
            <div style={{ display: 'flex' }}>Tu acceso al fútbol mexicano.</div>
            <div style={{ display: 'flex' }}>accesofutbol.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}
