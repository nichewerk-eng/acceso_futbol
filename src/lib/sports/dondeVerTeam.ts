import { attachDondeVer } from '@/config/dondeVer';
import {
  clubIdentityFromAbbr,
  getClubIdentity,
  type ClubIdentity,
} from '@/config/clubIdentity';
import { fetchLigaMxFixtures } from './espnFallback';
import { isFixtureHeld } from './localizeEs';
import type { Fixture } from './types';

export type TeamBroadcastSchedule = {
  club: ClubIdentity;
  /** Live now, else the next kickoff — the match users search "dónde ver" for. */
  next: Fixture | null;
  live: Fixture[];
  upcoming: Fixture[];
  /** Most recent finished matches (newest first), for context + internal links. */
  recent: Fixture[];
};

/** True when a fixture involves the club, tolerating ESPN/SM abbreviation variants. */
function involvesClub(f: Fixture, slug: string): boolean {
  return (
    clubIdentityFromAbbr(f.home.abbreviation)?.id === slug ||
    clubIdentityFromAbbr(f.away.abbreviation)?.id === slug
  );
}

/**
 * Broadcast schedule for one Liga MX club, derived from the canonical board
 * (`fetchLigaMxFixtures`) — never a second livescores merge, per the one-board rule.
 * Returns null for unknown or non-Liga-MX slugs.
 */
export async function getTeamBroadcastSchedule(
  slug: string,
  now = new Date()
): Promise<TeamBroadcastSchedule | null> {
  const club = getClubIdentity(slug);
  if (!club || club.league !== 'liga-mx') return null;

  const { fixtures } = await fetchLigaMxFixtures();
  const mine = fixtures
    .filter((f) => involvesClub(f, slug))
    .map(attachDondeVer)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const live = mine.filter((f) => f.state === 'in');
  const upcoming = mine.filter(
    (f) =>
      f.state === 'pre' &&
      !isFixtureHeld(f.statusLabel) &&
      +new Date(f.date) >= +now - 3 * 3600_000
  );
  const recent = mine.filter((f) => f.state === 'post').reverse().slice(0, 5);
  const next = live[0] ?? upcoming[0] ?? null;

  return { club, next, live, upcoming, recent };
}
