import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { ligaMxLogoSrc } from '@/config/ligaMxLogos';
import { leagueLabel } from '@/lib/seo';
import { getMatch, peekMatch } from '@/lib/sports/getMatch';
import type { MatchSnapshot } from '@/lib/sports/types';

export const alt = 'Acceso Futbol · capítulo del partido';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 60;

type Props = { params: Promise<{ league: string; id: string }> };

async function crestSrc(abbr: string, remote?: string): Promise<string | null> {
  const local = ligaMxLogoSrc(abbr);
  if (local) {
    try {
      const bytes = await readFile(join(process.cwd(), 'public', local.replace(/^\//, '')));
      const ext = local.toLowerCase().endsWith('.svg') ? 'svg+xml' : 'png';
      return `data:image/${ext};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch {
      /* fall through */
    }
  }
  if (remote && /^https?:\/\//i.test(remote)) return remote;
  return null;
}

async function loadMatch(league: string, id: string): Promise<MatchSnapshot | null> {
  return peekMatch(league, id) ?? (await getMatch(league, id).catch(() => null));
}

function statusLine(match: MatchSnapshot): string {
  if (match.state === 'in') return match.clock ? `EN VIVO · ${match.clock}` : 'EN VIVO';
  if (match.state === 'post') return 'FINAL';
  return 'POR JUGAR';
}

function scoreLine(match: MatchSnapshot): string {
  if (match.state === 'pre') return 'VS';
  return `${match.home.score ?? 0}–${match.away.score ?? 0}`;
}

export default async function OgImage({ params }: Props) {
  const { league, id } = await params;
  const fontsDir = join(process.cwd(), 'public/fonts');
  const [oswaldBold, bodyRegular, match] = await Promise.all([
    readFile(join(fontsDir, 'Oswald-Bold.woff')),
    readFile(join(fontsDir, 'NotoSans-Regular.woff')),
    loadMatch(league, id),
  ]);

  const label = leagueLabel(league);
  const homeAbbr = match?.home.abbreviation ?? 'LOC';
  const awayAbbr = match?.away.abbreviation ?? 'VIS';
  const [homeCrest, awayCrest] = match
    ? await Promise.all([
        crestSrc(match.home.abbreviation, match.home.logo),
        crestSrc(match.away.abbreviation, match.away.logo),
      ])
    : [null, null];

  const kicker = match
    ? ['AF://CAPÍTULO', label, match.jornada].filter(Boolean).join(' · ')
    : `AF://CAPÍTULO · ${label}`;

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
            padding: '48px 56px 44px',
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
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                letterSpacing: 4,
                fontWeight: 400,
                color: '#e05a0c',
              }}
            >
              {kicker}
            </div>
            <div style={{ display: 'flex', fontSize: 20, color: 'rgba(246,245,242,0.45)' }}>
              {match ? statusLine(match) : 'ACCESO FUTBOL'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 28,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280 }}>
              {homeCrest ? (
                <img
                  src={homeCrest}
                  width={132}
                  height={132}
                  alt=""
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', fontFamily: 'AF Display', fontSize: 72, fontWeight: 700 }}>
                  {homeAbbr}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  marginTop: 16,
                  fontFamily: 'AF Display',
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {homeAbbr}
              </div>
            </div>

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
                  fontSize: match?.state === 'pre' ? 72 : 96,
                  fontWeight: 700,
                  letterSpacing: -2,
                  lineHeight: 1,
                }}
              >
                {match ? scoreLine(match) : 'VS'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280 }}>
              {awayCrest ? (
                <img
                  src={awayCrest}
                  width={132}
                  height={132}
                  alt=""
                  style={{ objectFit: 'contain' }}
                />
              ) : (
                <div style={{ display: 'flex', fontFamily: 'AF Display', fontSize: 72, fontWeight: 700 }}>
                  {awayAbbr}
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  marginTop: 16,
                  fontFamily: 'AF Display',
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {awayAbbr}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', width: '100%', height: 6, background: '#e05a0c' }} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontSize: 22,
                color: 'rgba(246,245,242,0.55)',
              }}
            >
              <div style={{ display: 'flex' }}>Tu acceso al fútbol mexicano.</div>
              <div style={{ display: 'flex' }}>accesofutbol.com</div>
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
