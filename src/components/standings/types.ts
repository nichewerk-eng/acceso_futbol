export interface TeamEntry {
  position: number;
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  note: { color: string; description: string; rank: number } | null;
  gp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: string;
  pts: number;
}

export interface Group {
  name: string;
  abbreviation: string;
  entries: TeamEntry[];
}

export interface FixtureStatus {
  completed: boolean;
  state: string; // 'pre' | 'in' | 'post'
  description: string;
  shortDetail: string;
}

export interface FixtureTeam {
  name: string;
  abbreviation: string;
  score: string | null;
  penaltyScore: string | null; // set only for games decided by shootout
  winner: boolean; // true for the team that actually won (incl. via penalties)
}

export interface Fixture {
  id: string;
  date: string;
  status: FixtureStatus;
  venue: string | null;
  city: string | null;
  home: FixtureTeam;
  away: FixtureTeam;
}
