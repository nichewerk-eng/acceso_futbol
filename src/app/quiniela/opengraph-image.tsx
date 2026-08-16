import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getQuinielaBoard } from '@/lib/quiniela/service';
import type { Outcome, QuinielaMatch } from '@/lib/quiniela/types';

export const alt = 'La Quiniela Liga MX · 1 · X · 2 · Acceso Futbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 30;

const OUTCOMES: readonly Outcome[] = ['1', 'X', '2'];

function PickCell({ o, win }: { o: Outcome; win: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 36,
        border: '1px solid rgba(246,245,242,0.22)',
        background: win ? '#e05a0c' : 'transparent',
        color: win ? '#0c0c0c' : 'rgba(246,245,242,0.78)',
        fontFamily: 'AF Display',
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {o}
    </div>
  );
}

function MatchRow({ m }: { m: QuinielaMatch }) {
  const score =
    m.state === 'post' || m.state === 'in'
      ? `${m.home.score ?? 0}–${m.away.score ?? 0}`
      : '';
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          width: 220,
          fontFamily: 'AF Display',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {m.home.abbr}
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {OUTCOMES.map((o) => (
          <PickCell key={o} o={o} win={m.result === o} />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          width: 220,
          fontFamily: 'AF Display',
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {m.away.abbr}
      </div>
      <div
        style={{
          display: 'flex',
          flex: 1,
          fontSize: 18,
          color: 'rgba(246,245,242,0.45)',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {m.state === 'post' ? `FT ${score}` : m.state === 'in' ? score : ''}
      </div>
    </div>
  );
}

export default async function OgImage() {
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, board] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    getQuinielaBoard().catch(() => null),
  ]);

  const matches = (board?.matches ?? []).slice(0, 9);
  const kicker = board?.jornadaNumber
    ? `AF://QUINIELA · JORNADA ${board.jornadaNumber}`
    : 'AF://QUINIELA';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#0c0c0c',
          color: '#f6f5f2',
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
            padding: '40px 52px 36px',
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
            <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, color: '#e05a0c' }}>
              {kicker}
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(246,245,242,0.45)' }}>
              1 · X · 2
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontFamily: 'AF Display',
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            La Quiniela
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              flex: 1,
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {matches.length === 0 ? (
              <div style={{ display: 'flex', fontSize: 28, color: 'rgba(246,245,242,0.55)' }}>
                Pronostica la jornada · 1 local · X empate · 2 visita
              </div>
            ) : (
              matches.map((m) => <MatchRow key={m.id} m={m} />)
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 14 }}>
            <div style={{ display: 'flex', width: '100%', height: 6, background: '#e05a0c' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontSize: 20,
                color: 'rgba(246,245,242,0.55)',
              }}
            >
              <div style={{ display: 'flex' }}>Gratis · sin registro · Acceso Futbol</div>
              <div style={{ display: 'flex' }}>accesofutbol.com/quiniela</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'AF Body', data: bodyRegular, style: 'normal', weight: 400 },
        { name: 'AF Display', data: oswaldBold, style: 'normal', weight: 700 },
      ],
    }
  );
}
