import { LC_TEAM_NAMES, LEAGUES_CUP_PHASE_ONE } from '@/config/leaguesCup2026';
import { isLigaMxClubAbbr, isLigaMxSmTeamId } from './ligaMxTeams';
import { scheduleAbbr } from './ligaMxAbbr';
import type { Fixture } from './types';

/** Top 4 from each league table advance to knockout. */
export const LC_KO_SPOTS = 4;

/** Board / SM codes — keep CHI as Chicago (do not use Liga MX CHI→GDL legacy). */
function lcAbbr(abbr: string): string {
  const a = abbr.trim().toUpperCase();
  if (a === 'CHI') return 'CHI';
  return scheduleAbbr(a);
}

export type LcStandingEntry = {
  position: number;
  team: { id: string; name: string; abbreviation: string; logo?: string };
  gp: number;
  /** Regulation wins (PG) */
  w: number;
  /** Penalty shootout wins · PKW · 2 pts */
  pw: number;
  /** Penalty shootout losses · PKL · 1 pt */
  pl: number;
  /** Regulation losses (PP) */
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  /** Official clave: x = 1º asegurado · a = avanza · e = eliminado */
  mark?: 'x' | 'a' | 'e' | null;
};

export type LcStandingsPayload = {
  season: string;
  ligaMx: LcStandingEntry[];
  mls: LcStandingEntry[];
  source: 'fixtures' | 'sportmonks' | 'mixed';
};

type Acc = {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  gp: number;
  w: number;
  pw: number;
  pl: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
};

function emptyAcc(abbr: string, name: string, id = '', logo?: string): Acc {
  return {
    id: id || abbr,
    name,
    abbreviation: abbr,
    logo,
    gp: 0,
    w: 0,
    pw: 0,
    pl: 0,
    l: 0,
    gf: 0,
    ga: 0,
    pts: 0,
  };
}

function isMxSide(team: { id?: string; abbreviation?: string }): boolean {
  return isLigaMxSmTeamId(team.id) || isLigaMxClubAbbr(team.abbreviation);
}

function seedFromBoard(): Map<string, Acc> {
  const map = new Map<string, Acc>();
  for (const kick of LEAGUES_CUP_PHASE_ONE) {
    for (const code of [kick.home, kick.away]) {
      const abbr = lcAbbr(code);
      if (map.has(abbr)) continue;
      map.set(abbr, emptyAcc(abbr, LC_TEAM_NAMES[abbr] ?? LC_TEAM_NAMES[code] ?? abbr));
    }
  }
  return map;
}

function sortEntries(rows: Acc[]): LcStandingEntry[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga;
    const gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    // Official: more regulation wins
    if (b.w !== a.w) return b.w - a.w;
    if (b.gf !== a.gf) return b.gf - a.gf;
    // Official: fewer goals conceded
    if (a.ga !== b.ga) return a.ga - b.ga;
    return a.abbreviation.localeCompare(b.abbreviation);
  });

  const GAMES_PER_TEAM = 3;
  const fourthPts = sorted[LC_KO_SPOTS - 1]?.pts ?? 0;
  const leader = sorted[0];

  return sorted.map((r, i) => {
    const position = i + 1;
    const remaining = Math.max(0, GAMES_PER_TEAM - r.gp);
    const maxPts = r.pts + remaining * 3;
    let mark: 'x' | 'a' | 'e' | null = null;
    if (position > LC_KO_SPOTS && maxPts < fourthPts) {
      mark = 'e';
    } else if (position <= LC_KO_SPOTS) {
      mark = 'a';
      // First place locked: leader's pts > anyone else's max reachable
      if (
        position === 1 &&
        leader &&
        sorted.slice(1).every((o) => {
          const oMax = o.pts + Math.max(0, GAMES_PER_TEAM - o.gp) * 3;
          return r.pts > oMax;
        })
      ) {
        mark = 'x';
      }
    }
    return {
      position,
      team: {
        id: r.id,
        name: r.name,
        abbreviation: r.abbreviation,
        logo: r.logo,
      },
      gp: r.gp,
      w: r.w,
      pw: r.pw,
      pl: r.pl,
      l: r.l,
      gf: r.gf,
      ga: r.ga,
      gd: r.gf - r.ga,
      pts: r.pts,
      mark,
    };
  });
}

/**
 * Phase One standings from finished board fixtures.
 * Points: 3 regulation win · 2 pen win · 1 pen loss · 0 regulation loss.
 */
export function buildLeaguesCupStandingsFromFixtures(
  fixtures: Fixture[]
): LcStandingsPayload {
  const byAbbr = seedFromBoard();

  const phase = fixtures.filter(
    (f) =>
      !f.id.startsWith('lc-') &&
      !(f.jornada && /final|semifinal|quarter|third|tercer/i.test(f.jornada))
  );

  for (const f of phase) {
    const homeAbbr = lcAbbr(f.home.abbreviation);
    const awayAbbr = lcAbbr(f.away.abbreviation);
    const home =
      byAbbr.get(homeAbbr) ??
      emptyAcc(homeAbbr, f.home.name || homeAbbr, f.home.id, f.home.logo);
    const away =
      byAbbr.get(awayAbbr) ??
      emptyAcc(awayAbbr, f.away.name || awayAbbr, f.away.id, f.away.logo);
    home.name = f.home.name || home.name;
    away.name = f.away.name || away.name;
    if (f.home.id) home.id = f.home.id;
    if (f.away.id) away.id = f.away.id;
    if (f.home.logo) home.logo = f.home.logo;
    if (f.away.logo) away.logo = f.away.logo;
    byAbbr.set(homeAbbr, home);
    byAbbr.set(awayAbbr, away);

    if (f.state !== 'post') continue;

    const hs = Number(f.home.score ?? 0);
    const as = Number(f.away.score ?? 0);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;

    home.gp += 1;
    away.gp += 1;
    home.gf += hs;
    home.ga += as;
    away.gf += as;
    away.ga += hs;

    const pens =
      hs === as ||
      /penal|AET|AP/i.test(f.statusLabel || '') ||
      f.clock === 'PEN';

    if (pens) {
      const winner = f.winnerSide;
      if (winner === 'home') {
        home.pw += 1;
        home.pts += 2;
        away.pl += 1;
        away.pts += 1;
      } else if (winner === 'away') {
        away.pw += 1;
        away.pts += 2;
        home.pl += 1;
        home.pts += 1;
      }
      // No winner yet — leave as played without awarding (rare)
      continue;
    }

    if (hs > as) {
      home.w += 1;
      home.pts += 3;
      away.l += 1;
    } else if (as > hs) {
      away.w += 1;
      away.pts += 3;
      home.l += 1;
    }
  }

  const ligaMx: Acc[] = [];
  const mls: Acc[] = [];
  for (const row of byAbbr.values()) {
    if (isMxSide(row)) ligaMx.push(row);
    else mls.push(row);
  }

  return {
    season: 'Leagues Cup 2026',
    ligaMx: sortEntries(ligaMx),
    mls: sortEntries(mls),
    source: 'fixtures',
  };
}
