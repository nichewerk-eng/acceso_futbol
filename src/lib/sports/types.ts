/** Normalized sports types — UI never depends on Sportmonks or ESPN shapes. */

export type MatchState = 'pre' | 'in' | 'post';

export interface TeamRef {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  score?: string | null;
}

export type LiveEventKind =
  | 'goal'
  | 'own_goal'
  | 'penalty'
  | 'yellow'
  | 'red'
  | 'sub'
  | 'var'
  | 'other';

export interface LiveEvent {
  id: string;
  period: number;
  clock: string;
  minute?: number;
  /** Extra minutes (e.g. 90+2 → extraMinute 2). */
  extraMinute?: number;
  /** Short Spanish label: Gol, Amarilla, Cambio… */
  type: string;
  /** Machine kind for UI filters / peaks. */
  kind?: LiveEventKind;
  text: string;
  teamAbbr?: string;
  side?: 'home' | 'away';
  playerName?: string;
  relatedPlayerName?: string;
  playerPhoto?: string;
}

export interface CommentaryLine {
  id: string;
  minute?: number;
  /** Display clock as delivered by provider (e.g. 45'+7'). */
  clock?: string;
  order?: number;
  text: string;
  isGoal?: boolean;
}

export interface FixtureScorer {
  name: string;
  minute: string;
  side: 'home' | 'away';
  pen?: boolean;
  og?: boolean;
  photo?: string;
}

export interface Fixture {
  id: string;
  provider: 'sportmonks' | 'espn';
  league: 'liga-mx' | 'liga-mx-femenil' | 'leagues-cup' | 'seleccion' | 'other';
  date: string;
  /**
   * Official board calendar day (YYYY-MM-DD) when kickoff TZ differs from the viewer.
   * Used for Leagues Cup day grouping.
   */
  scheduleDay?: string;
  /**
   * IANA timezone of the venue wall clock (Leagues Cup official board).
   * When set, UI should show kickoff in this zone to match ESPN venue-local listings.
   */
  venueTz?: string;
  jornada?: string | null;
  state: MatchState;
  statusLabel: string;
  clock?: string;
  venue?: string | null;
  city?: string | null;
  home: TeamRef;
  away: TeamRef;
  /** Winner side when known; null = draw / not decided. */
  winnerSide?: 'home' | 'away' | null;
  /** Goal scorers from board details (compact UI). */
  scorers?: FixtureScorer[];
  /** MX / US broadcast hints when known */
  dondeVer?: {
    mx?: string;
    us?: string;
    mxChannels?: Array<
      | 'tudn'
      | 'vix'
      | 'canal-5'
      | 'layvtime'
      | 'univision'
      | 'unimas'
      | 'apple-tv'
      | 'fs1'
      | 'imagen-tv'
      | 'azteca-7'
      | 'espn'
      | 'disney-plus'
      | 'fox'
      | 'fox-one'
      | 'fox-deportes'
      | 'tsn'
      | 'televisa'
    >;
    usChannels?: Array<
      | 'tudn'
      | 'vix'
      | 'canal-5'
      | 'layvtime'
      | 'univision'
      | 'unimas'
      | 'apple-tv'
      | 'fs1'
      | 'imagen-tv'
      | 'azteca-7'
      | 'espn'
      | 'disney-plus'
      | 'fox'
      | 'fox-one'
      | 'fox-deportes'
      | 'tsn'
      | 'televisa'
    >;
  };
}

export type LineupRole = 'starter' | 'bench';
export type LineupPos = 'GK' | 'DEF' | 'MID' | 'FWD' | '?';

export interface LineupPlayer {
  id: string;
  name: string;
  jersey?: number | null;
  position: LineupPos;
  positionLabel: string;
  role: LineupRole;
  side: 'home' | 'away';
  /** Sportmonks player headshot when available. */
  photo?: string;
}

export interface TeamLineup {
  side: 'home' | 'away';
  teamName: string;
  abbreviation: string;
  formation?: string | null;
  starters: LineupPlayer[];
  bench: LineupPlayer[];
}

/** W = win, D = draw, L = loss from this team's perspective. */
export type FormResult = 'W' | 'D' | 'L';

export interface FormMatch {
  id: string;
  date: string;
  opponentAbbr: string;
  opponentName: string;
  homeScore: string;
  awayScore: string;
  /** Whether this team was home in that fixture. */
  playedHome: boolean;
  result: FormResult;
}

export interface HeadToHeadMeeting {
  id: string;
  date: string;
  homeAbbr: string;
  awayAbbr: string;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
}

export interface HeadToHeadSummary {
  played: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  meetings: HeadToHeadMeeting[];
}

export interface MatchSnapshot extends Fixture {
  events: LiveEvent[];
  comments: CommentaryLine[];
  stats?: { label: string; home: string; away: string }[];
  lineups?: TeamLineup[];
  referee?: string | null;
  /** Last finished matches for home / away (most recent first). */
  form?: { home: FormMatch[]; away: FormMatch[] };
  headToHead?: HeadToHeadSummary | null;
}

export interface PulsePayload {
  source: 'sportmonks' | 'espn' | 'static';
  generatedAt: string;
  live: Fixture[];
  upcoming: Fixture[];
  recent: Fixture[];
  weather: EditorialWeather;
}

export interface EditorialWeather {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tag?: string;
}
