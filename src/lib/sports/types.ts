/** Normalized sports types — UI never depends on Sportmonks or ESPN shapes. */

export type MatchState = 'pre' | 'in' | 'post';

export interface TeamRef {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  score?: string | null;
}

export interface LiveEvent {
  id: string;
  period: number;
  clock: string;
  minute?: number;
  type: string;
  text: string;
  teamAbbr?: string;
  playerName?: string;
}

export interface CommentaryLine {
  id: string;
  minute?: number;
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
}

export interface Fixture {
  id: string;
  provider: 'sportmonks' | 'espn';
  league: 'liga-mx' | 'liga-mx-femenil' | 'leagues-cup' | 'seleccion' | 'other';
  date: string;
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
  dondeVer?: { mx?: string; us?: string };
}

export interface MatchSnapshot extends Fixture {
  events: LiveEvent[];
  comments: CommentaryLine[];
  stats?: { label: string; home: string; away: string }[];
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
