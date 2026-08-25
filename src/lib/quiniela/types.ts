/** La Quiniela AF — 1 (local) / X (empate) / 2 (visita) per Liga MX jornada match. */

export type Outcome = '1' | 'X' | '2';

export interface QuinielaSide {
  name: string;
  abbr: string;
  clubId: string | null;
  logo?: string;
  score: number | null;
}

export interface QuinielaMatch {
  id: string;
  date: string;
  state: 'pre' | 'in' | 'post';
  /** Kickoff reached → pick can no longer be set/changed. */
  locked: boolean;
  home: QuinielaSide;
  away: QuinielaSide;
  /** Final result (only when the match is over). */
  result: Outcome | null;
}

export interface QuinielaBoard {
  torneo: string;
  jornadaKey: string;
  jornadaNumber: number;
  jornadaLabel: string;
  /** Earliest still-open kickoff — the first lock. */
  deadline: string | null;
  matches: QuinielaMatch[];
  finals: number;
  total: number;
  /** Sealed ranking is kept through the Mexico day after the last kickoff. */
  holding: boolean;
  generatedAt: string;
}

export interface QuinielaPicks {
  userId: string;
  name: string;
  picks: Record<string, Outcome>;
  ts: number;
}

export interface LeaderRow {
  userId: string;
  name: string;
  /** Correct final results. */
  points: number;
  /** Finals the user had a pick for. */
  played: number;
  /** Total picks made this jornada. */
  picks: number;
}

export interface QuinielaLeaderboard {
  jornadaKey: string;
  rows: LeaderRow[];
  entries: number;
}

/** The caller's cumulative season card (Phase 2 — season memory + rachas). */
export interface SeasonMe {
  /** 1-based position on the season tabla. */
  rank: number;
  entries: number;
  /** Cumulative correct picks. */
  points: number;
  /** Cumulative graded picks. */
  played: number;
  jornadasPlayed: number;
  bestJornada: number;
  /** Correct / played, 0–100. */
  winRate: number;
  /** Consecutive jornadas played. */
  participation: number;
  bestParticipation: number;
  /** Consecutive correct picks across matches. */
  accuracy: number;
  bestAccuracy: number;
}

export interface SeasonStandingRow {
  userId: string;
  name: string;
  points: number;
  jornadasPlayed: number;
}

export interface SeasonView {
  me: SeasonMe | null;
  top: SeasonStandingRow[];
  entries: number;
}
