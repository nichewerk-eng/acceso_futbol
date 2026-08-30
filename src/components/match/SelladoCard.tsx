import { ClubLogo } from '@/components/brand/ClubLogo';
import { PartidoLink } from '@/components/partido/PartidoLink';
import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import type { Fixture, FixtureScorer } from '@/lib/sports/types';

export type SelladoSide = {
  id?: string;
  name: string;
  abbreviation: string;
  logo?: string;
  score?: string | null;
};

function shortClubLabel(name: string, abbr: string) {
  const cleaned = name
    .replace(/\b(F\.?C\.?|C\.?F\.?|S\.?C\.?|Club|Deportivo|CF)\b/gi, '')
    .replace(/\s+W$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return abbr;
  if (cleaned.length > 16) return abbr;
  return cleaned;
}

function scoreN(score: string | null | undefined) {
  const n = Number(score);
  return Number.isFinite(n) ? n : 0;
}

function winnerFromScores(
  home: string | null | undefined,
  away: string | null | undefined
): 'home' | 'away' | null {
  const hs = Number(home);
  const as = Number(away);
  if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) return null;
  return hs > as ? 'home' : 'away';
}

function jornadaChip(jornada?: string | null): string | null {
  if (!jornada) return null;
  const j = jornada.match(/jornada\s*(\d+)/i);
  if (j) return `J${j[1]}`;
  if (/fase\s*1/i.test(jornada)) return 'F1';
  if (/quarter|cuarto/i.test(jornada)) return 'QF';
  if (/semifinal/i.test(jornada)) return 'SF';
  if (/third|tercer/i.test(jornada)) return '3º';
  if (/final/i.test(jornada)) return 'FINAL';
  return null;
}

function liveStamp(clock?: string | null, statusLabel?: string | null) {
  if (clock === 'HT' || /descanso/i.test(statusLabel || '')) return 'HT';
  return clock || 'LIVE';
}

function formatScorer(s: FixtureScorer) {
  const tag = s.pen ? ' P' : s.og ? ' OG' : '';
  return `${s.name}${s.minute ? ` ${s.minute}` : ''}${tag}`;
}

function sideScorers(list: FixtureScorer[] | undefined, side: 'home' | 'away') {
  const rows = (list ?? []).filter((s) => s.side === side);
  if (rows.length === 0) return [];
  if (rows.length <= 3) return rows.map(formatScorer);
  return [...rows.slice(0, 2).map(formatScorer), `+${rows.length - 2}`];
}

function sideTone(
  winner: 'home' | 'away' | null,
  side: 'home' | 'away',
  live: boolean
) {
  if (live) return '';
  if (winner === side) return 'is-win';
  if (winner) return 'is-lose';
  return 'is-draw';
}

export function SelladoCard({
  href,
  testId,
  home,
  away,
  winnerSide,
  scorers,
  jornada,
  clubResult,
  stamp = 'FT',
  live = false,
}: {
  href: string;
  testId: string;
  home: SelladoSide;
  away: SelladoSide;
  winnerSide?: 'home' | 'away' | null;
  scorers?: FixtureScorer[];
  jornada?: string | null;
  clubResult?: 'W' | 'D' | 'L' | null;
  stamp?: string;
  live?: boolean;
}) {
  const winner = live ? null : (winnerSide ?? winnerFromScores(home.score, away.score));
  const hs = scoreN(home.score);
  const as = scoreN(away.score);
  const gd = Math.abs(hs - as);
  const mood = live
    ? null
    : winner == null
      ? hs === 0 && as === 0
        ? 'SIN GOLES'
        : 'EMPATE'
      : gd >= 3
        ? 'GOLEADA'
        : null;
  const round = jornadaChip(jornada);
  const homeGoals = sideScorers(scorers, 'home');
  const awayGoals = sideScorers(scorers, 'away');
  const hasGoals = homeGoals.length + awayGoals.length > 0;
  const homeTone = sideTone(winner, 'home', live);
  const awayTone = sideTone(winner, 'away', live);

  return (
    <PartidoLink
      href={href}
      data-testid={testId}
      className={[
        'sellado',
        'jor-rise',
        live ? 'is-live' : '',
        !live && winner === 'home' ? 'is-home-win' : '',
        !live && winner === 'away' ? 'is-away-win' : '',
        !live && !winner ? 'is-draw' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="sellado-rail">
        <span className="sellado-ft">
          {live ? <span className="hoy-live-dot" aria-hidden /> : null}
          {stamp}
        </span>
        {round ? <span className="sellado-round">{round}</span> : null}
        {mood || clubResult ? (
          <span className="sellado-rail-end">
            {mood ? <span className="sellado-mood">{mood}</span> : null}
            {clubResult ? <span className="sellado-wdl">{clubResult}</span> : null}
          </span>
        ) : null}
      </div>

      <div className="sellado-board">
        <SelladoClub team={home} tone={homeTone} align="home" />
        <p
          className="sellado-score"
          aria-label={`${hs} a ${as}`}
        >
          <span className={['sellado-n', homeTone].filter(Boolean).join(' ')}>{hs}</span>
          <span className="sellado-dash">–</span>
          <span className={['sellado-n', awayTone].filter(Boolean).join(' ')}>{as}</span>
        </p>
        <SelladoClub team={away} tone={awayTone} align="away" />
        {hasGoals ? (
          <>
            <p className="sellado-goals is-home">{homeGoals.join(' · ') || '\u00a0'}</p>
            <p className="sellado-goals is-away">{awayGoals.join(' · ') || '\u00a0'}</p>
          </>
        ) : null}
      </div>
    </PartidoLink>
  );
}

function SelladoClub({
  team,
  tone,
  align,
}: {
  team: SelladoSide;
  tone: string;
  align: 'home' | 'away';
}) {
  const clubId = team.id ?? ligaMxClubIdFromAbbr(team.abbreviation) ?? undefined;
  return (
    <span className={['sellado-club', `is-${align}`, tone].filter(Boolean).join(' ')}>
      <ClubLogo
        abbr={team.abbreviation}
        clubId={clubId}
        name={team.name}
        logoUrl={team.logo}
        size="md"
      />
      <span className="sellado-name" title={team.name}>
        {shortClubLabel(team.name, team.abbreviation)}
      </span>
    </span>
  );
}

export function SelladoFromFixture({
  f,
  href,
  testId,
  clubResult,
}: {
  f: Fixture;
  href: string;
  testId: string;
  clubResult?: 'W' | 'D' | 'L' | null;
}) {
  const live = f.state === 'in';
  return (
    <SelladoCard
      href={href}
      testId={testId}
      home={f.home}
      away={f.away}
      winnerSide={f.winnerSide}
      scorers={f.scorers}
      jornada={f.jornada}
      clubResult={clubResult}
      stamp={live ? liveStamp(f.clock, f.statusLabel) : 'FT'}
      live={live}
    />
  );
}
