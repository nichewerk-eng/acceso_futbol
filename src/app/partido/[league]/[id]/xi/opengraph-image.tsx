import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { xiConfirmed, xiKit, xiPins, xiShortName } from '@/lib/share/xiShare';
import { getMatch, peekMatch } from '@/lib/sports/getMatch';
import type { MatchSnapshot, TeamLineup } from '@/lib/sports/types';

export const alt = 'XI confirmado · Acceso Futbol';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

type Props = { params: Promise<{ league: string; id: string }> };

async function loadMatch(league: string, id: string): Promise<MatchSnapshot | null> {
  return peekMatch(league, id) ?? (await getMatch(league, id).catch(() => null));
}

function OgPitch({ team }: { team: TeamLineup }) {
  const pins = xiPins(team);
  const tag = team.formation
    ? `${team.side === 'home' ? '1P' : '2P'} · ${team.formation} · ${xiConfirmed(team) ? 'XI' : 'PARCIAL'}`
    : `${team.side === 'home' ? '1P' : '2P'} · ${xiConfirmed(team) ? 'XI CONFIRMADO' : 'XI PARCIAL'}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: 540,
        height: 500,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'AF Display',
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        {team.abbreviation}
        <span style={{ marginLeft: 10, fontSize: 16, color: 'rgba(246,245,242,0.5)', fontFamily: 'AF Body' }}>
          {tag}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 540,
          height: 454,
          backgroundColor: '#17662a',
          backgroundImage: 'repeating-linear-gradient(to bottom, #1f7a34 0 28px, #17662a 28px 56px)',
          border: '4px solid #1e223d',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: '3%',
            top: '3%',
            width: '94%',
            height: '94%',
            border: '3px solid rgba(246,245,242,0.45)',
          }}
        />
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: '3%',
            top: '50%',
            width: '94%',
            height: 3,
            background: 'rgba(246,245,242,0.45)',
          }}
        />
        {pins.map((pin) => {
          const kit = xiKit(team.abbreviation, pin.player.position);
          return (
            <div
              key={pin.player.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: 'translate(-50%, -50%)',
                width: 56,
              }}
            >
              {pin.player.photo ? (
                <img
                  src={pin.player.photo}
                  width={24}
                  height={24}
                  alt=""
                  style={{
                    objectFit: 'cover',
                    border: '2px solid #1e223d',
                    background: '#e0b089',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    width: 24,
                    height: 24,
                    border: '2px solid #1e223d',
                    background: '#e0b089',
                  }}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 18,
                  marginTop: -2,
                  background: kit.shirt,
                  border: '2px solid #1e223d',
                  color: kit.number,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {pin.player.jersey ?? '·'}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: 28,
                  height: 8,
                  background: kit.shorts,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  marginTop: 4,
                  fontSize: 12,
                  color: '#f6f5f2',
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                {xiShortName(pin.player.name)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function OgImage({ params }: Props) {
  const { league, id } = await params;
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, match] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    loadMatch(league, id),
  ]);

  const sides = match?.lineups ?? [];
  const pair = match
    ? `${match.home.abbreviation} vs ${match.away.abbreviation}`
    : 'Liga MX';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#1e223d',
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
            padding: '28px 36px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', fontSize: 18, letterSpacing: 4, color: '#f54f1b' }}>
              AF://XI · {pair}
            </div>
            <div style={{ display: 'flex', fontSize: 16, color: 'rgba(246,245,242,0.45)' }}>
              {match?.jornada ?? 'LIGA MX'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: '100%',
              flex: 1,
              alignItems: 'center',
              gap: 20,
            }}
          >
            {sides.length === 0 ? (
              <div style={{ display: 'flex', fontSize: 26, color: 'rgba(246,245,242,0.5)' }}>
                Alineaciones cuando el club confirme
              </div>
            ) : (
              sides.map((team) => <OgPitch key={team.side} team={team} />)
            )}
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
