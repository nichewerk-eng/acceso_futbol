import type { FixtureScorer, MatchState } from '@/lib/sports/types';

export type SelloKind = 'pre' | 'live' | 'gol' | 'final';

export type SelloGravitySide = 'home' | 'away' | null;

export type SelloPalette = {
  ink: string;
  signal: string;
  onInk: string;
};

export type SelloMint = {
  id: string;
  kind: SelloKind;
  league: string;
  fixtureId: string;
  state: MatchState;
  home: {
    id?: string;
    name: string;
    abbreviation: string;
    score: string;
    logo?: string;
  };
  away: {
    id?: string;
    name: string;
    abbreviation: string;
    score: string;
    logo?: string;
  };
  winnerSide: 'home' | 'away' | null;
  clock?: string;
  jornada?: string | null;
  scorer?: FixtureScorer | null;
  kicker: string;
  stamp: string;
  headline: string;
  line: string;
  dondeVer?: string | null;
  gravityClubId: string | null;
  gravitySide: SelloGravitySide;
  palette: SelloPalette;
  href: string;
  partidoHref: string;
};
