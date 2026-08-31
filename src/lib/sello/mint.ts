import { EL_TRI } from '@/config/clubs';
import { clubAbbrHits, clubById, clubNameHits, gravityMatches } from '@/config/clubMatch';
import { TV_CHANNELS } from '@/config/dondeVer';
import { leaguePath } from '@/lib/radio/phases';
import type { Fixture, FixtureScorer, LiveEvent, MatchState } from '@/lib/sports/types';
import { selloCopy, selloPalette } from './copy';
import type { SelloGravitySide, SelloKind, SelloMint } from './types';

export type MintGravity = {
  clubId?: string | null;
  elTri?: boolean;
};

export type MintInput = Fixture & { events?: LiveEvent[] };

function scoreN(v: string | number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function winnerSideOf(f: Pick<Fixture, 'home' | 'away' | 'winnerSide'>): 'home' | 'away' | null {
  if (f.winnerSide === 'home' || f.winnerSide === 'away') return f.winnerSide;
  const h = scoreN(f.home.score);
  const a = scoreN(f.away.score);
  if (h === a) return null;
  return h > a ? 'home' : 'away';
}

function minuteN(raw: string | number | undefined): number {
  const n = parseInt(String(raw ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

export function latestScorer(scorers: FixtureScorer[] | undefined): FixtureScorer | null {
  if (!scorers?.length) return null;
  return [...scorers].sort((a, b) => minuteN(a.minute) - minuteN(b.minute)).at(-1) ?? null;
}

function gravityClub(gravity: MintGravity | undefined) {
  if (gravity?.clubId === 'el-tri' || (gravity?.elTri && !gravity?.clubId)) return EL_TRI;
  return gravity?.clubId ? clubById(gravity.clubId) : null;
}

export function gravitySideOf(
  f: Pick<Fixture, 'home' | 'away'>,
  gravity: MintGravity | undefined
): SelloGravitySide {
  const club = gravityClub(gravity);
  if (!club) return null;
  if (clubNameHits(f.home.name, club) || clubAbbrHits(f.home.abbreviation, club)) return 'home';
  if (clubNameHits(f.away.name, club) || clubAbbrHits(f.away.abbreviation, club)) return 'away';
  return null;
}

export function fixtureMatchesGravity(
  f: Pick<Fixture, 'home' | 'away'>,
  gravity: MintGravity | undefined
): boolean {
  const club = gravityClub(gravity);
  const elTri = Boolean(gravity?.elTri) || club?.id === 'el-tri';
  return gravityMatches(
    club?.id === 'el-tri' ? null : club,
    elTri,
    f.home.name,
    f.away.name,
    f.home.abbreviation,
    f.away.abbreviation
  );
}

function dondeVerLine(f: Fixture): string | null {
  const d = f.dondeVer;
  if (!d) return null;
  const mx =
    d.mxChannels?.map((id) => TV_CHANNELS[id]?.label).filter(Boolean).join(' · ') || d.mx || '';
  const us =
    d.usChannels?.map((id) => TV_CHANNELS[id]?.label).filter(Boolean).join(' · ') || d.us || '';
  const parts = [mx, us].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export function mintKind(f: Pick<Fixture, 'state' | 'scorers'>): SelloKind {
  if (f.state === 'post') return 'final';
  if (f.state === 'pre') return 'pre';
  if (latestScorer(f.scorers)) return 'gol';
  return 'live';
}

function mintId(f: Fixture, kind: SelloKind, scorer: FixtureScorer | null): string {
  const h = scoreN(f.home.score);
  const a = scoreN(f.away.score);
  if (kind === 'gol') {
    return `${f.id}:gol:${h}-${a}:${scorer?.name ?? ''}:${scorer?.minute ?? ''}`;
  }
  if (kind === 'final') return `${f.id}:ft:${h}-${a}`;
  if (kind === 'live') return `${f.id}:live:${h}-${a}`;
  return `${f.id}:pre`;
}

function stampFor(kind: SelloKind, f: Fixture): string {
  if (kind === 'gol') return 'GOL';
  if (kind === 'final') return 'FT';
  if (kind === 'pre') return 'VS';
  const clock = (f.clock || '').trim();
  if (clock === 'HT' || /descanso/i.test(f.statusLabel || '')) return 'HT';
  return clock || 'LIVE';
}

export function mintFromFixture(f: MintInput, gravity?: MintGravity): SelloMint {
  const kind = mintKind(f);
  const scorer = kind === 'gol' || kind === 'final' ? latestScorer(f.scorers) : null;
  const gravityClubId = gravityClub(gravity)?.id ?? null;
  const gravitySide = gravitySideOf(f, gravity);
  const homeScore = scoreN(f.home.score);
  const awayScore = scoreN(f.away.score);
  const winnerSide = f.state === 'post' ? winnerSideOf(f) : null;
  const copy = selloCopy({
    kind,
    fixture: f,
    homeScore,
    awayScore,
    winnerSide,
    scorer,
    gravitySide,
    gravityClubId,
  });
  const league = leaguePath(f.league);
  const partidoHref = `/partido/${league}/${f.id}`;

  return {
    id: mintId(f, kind, scorer),
    kind,
    league,
    fixtureId: f.id,
    state: f.state,
    home: {
      id: f.home.id,
      name: f.home.name,
      abbreviation: f.home.abbreviation,
      score: String(homeScore),
      logo: f.home.logo,
    },
    away: {
      id: f.away.id,
      name: f.away.name,
      abbreviation: f.away.abbreviation,
      score: String(awayScore),
      logo: f.away.logo,
    },
    winnerSide,
    clock: f.clock,
    jornada: f.jornada,
    scorer,
    kicker: copy.kicker,
    stamp: stampFor(kind, f),
    headline: copy.headline,
    line: copy.line,
    dondeVer: kind === 'pre' || kind === 'live' ? dondeVerLine(f) : null,
    gravityClubId: gravitySide ? gravityClubId : null,
    gravitySide,
    palette: selloPalette(gravitySide ? gravityClubId : null),
    href: `/sello/${league}/${f.id}`,
    partidoHref,
  };
}

function drama(f: Fixture): number {
  const h = scoreN(f.home.score);
  const a = scoreN(f.away.score);
  const margin = Math.abs(h - a);
  let n = margin * 10 + h + a;
  if (f.state === 'in') n += 80;
  if (margin >= 3) n += 24;
  if (h + a >= 4) n += 10;
  return n;
}

/** The card to show now: gravity first, then the loudest live/post game. */
export function pickLeadMint(games: MintInput[], gravity?: MintGravity): SelloMint | null {
  if (games.length === 0) return null;
  const mine = gravity ? games.filter((g) => fixtureMatchesGravity(g, gravity)) : [];
  const pool = mine.length ? mine : games;
  const live = pool.filter((g) => g.state === 'in');
  const post = pool.filter((g) => g.state === 'post');
  const pre = pool.filter((g) => g.state === 'pre');
  const lead =
    [...live].sort((a, b) => drama(b) - drama(a))[0] ??
    [...post].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0] ??
    [...pre].sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] ??
    pool[0];
  return lead ? mintFromFixture(lead, gravity) : null;
}

export type SelloAlertKind = 'kickoff' | 'goal' | 'final';

export type SelloSnap = { state: MatchState; hs: number; as: number };

export function selloSnap(f: Pick<Fixture, 'state' | 'home' | 'away'>): SelloSnap {
  return { state: f.state, hs: scoreN(f.home.score), as: scoreN(f.away.score) };
}

/**
 * New mint-worthy ticks from a previous snapshot.
 * Catch-up FT (never saw live) is not an overlay. A live whistle is.
 */
export function selloAlerts(prev: SelloSnap | undefined, cur: SelloSnap): SelloAlertKind[] {
  if (!prev) return [];
  const out: SelloAlertKind[] = [];
  if (prev.state !== 'in' && cur.state === 'in') out.push('kickoff');
  const scored = cur.hs > prev.hs || cur.as > prev.as;
  if (scored && prev.state === 'in' && (cur.state === 'in' || cur.state === 'post')) {
    out.push('goal');
  }
  if (prev.state === 'in' && cur.state === 'post' && !scored) out.push('final');
  return out;
}
