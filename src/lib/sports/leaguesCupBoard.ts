import {
  LC_TEAM_NAMES,
  LEAGUES_CUP_KNOCKOUT,
  LEAGUES_CUP_PHASE_ONE,
  lcLocalToIso,
  type LcKick,
  type LcKnockoutSlot,
} from '@/config/leaguesCup2026';
import { TV_CHANNELS, type TvChannelId } from '@/config/dondeVer';
import { mlsLogoSrc } from '@/config/mlsLogos';
import { ligaMxLogoSrc } from '@/config/ligaMxLogos';
import { FRESH, isNearKickoff } from './freshness';
import { scheduleAbbr } from './ligaMxAbbr';
import {
  fetchFixturesByDate,
  fetchLeaguesCupSeasonFixtures,
  fetchLivescores,
  leaguesCupLeagueId,
  overlayLiveFixtures,
  sportmonksEnabled,
} from './sportmonks';
import type { Fixture, TeamRef } from './types';

function norm(abbr: string): string {
  const a = abbr.trim().toUpperCase();
  // Sportmonks Chicago Fire is CHI — do not collapse to Chivas GDL.
  if (a === 'CHI') return 'CHI';
  if (a === 'LAF') return 'LAFC';
  if (a === 'POT') return 'POR';
  if (a === 'SD') return 'SDL';
  return scheduleAbbr(a);
}

function teamFromAbbr(abbr: string, sm?: TeamRef): TeamRef {
  const code = norm(abbr);
  const logo =
    sm?.logo ??
    mlsLogoSrc(sm?.id) ??
    mlsLogoSrc(code) ??
    ligaMxLogoSrc(code) ??
    undefined;
  return {
    id: sm?.id ?? code,
    name: LC_TEAM_NAMES[code] ?? sm?.name ?? code,
    abbreviation: code,
    logo,
    score: sm?.score ?? null,
  };
}

function pickSide(sm: Fixture, want: string): TeamRef | undefined {
  const w = norm(want);
  if (norm(sm.home.abbreviation) === w || (w === 'CHI' && sm.home.id === '75')) return sm.home;
  if (norm(sm.away.abbreviation) === w || (w === 'CHI' && sm.away.id === '75')) return sm.away;
  return undefined;
}

function channelsFor(kick: LcKick): Fixture['dondeVer'] {
  // US: LeaguesCup.com listing. MX: Apple TV + optional Imagen TV select grid.
  const us = kick.us;
  const mx: TvChannelId[] = kick.mx ?? ['apple-tv'];
  return {
    mx: mx.map((id) => TV_CHANNELS[id].label).join(' · '),
    us: us.map((id) => TV_CHANNELS[id].label).join(' · '),
    mxChannels: mx,
    usChannels: us,
  };
}

function fixtureFromKick(kick: LcKick, sm?: Fixture): Fixture {
  const date = lcLocalToIso(kick.boardDate, kick.localTime, kick.tz);
  const homeSm = sm ? pickSide(sm, kick.home) : undefined;
  const awaySm = sm ? pickSide(sm, kick.away) : undefined;
  let winnerSide: Fixture['winnerSide'] = null;
  if (sm?.winnerSide && homeSm && awaySm) {
    if (sm.winnerSide === 'home') {
      winnerSide = homeSm.id === sm.home.id ? 'home' : 'away';
    } else if (sm.winnerSide === 'away') {
      winnerSide = awaySm.id === sm.away.id ? 'away' : 'home';
    }
  }

  return {
    id: String(kick.smId),
    provider: 'sportmonks',
    league: 'leagues-cup',
    date,
    scheduleDay: kick.boardDate,
    jornada: 'Fase 1',
    state: sm?.state ?? 'pre',
    statusLabel: sm?.statusLabel ?? 'Programado',
    clock: sm?.clock,
    venue: kick.venue,
    city: null,
    winnerSide,
    scorers: sm?.scorers,
    home: teamFromAbbr(kick.home, homeSm ? { ...homeSm, score: homeSm.score } : undefined),
    away: teamFromAbbr(kick.away, awaySm ? { ...awaySm, score: awaySm.score } : undefined),
    dondeVer: channelsFor(kick),
  };
}

function knockoutFixture(slot: LcKnockoutSlot): Fixture {
  const date = slot.boardDate
    ? lcLocalToIso(slot.boardDate, '20:00', 'America/New_York')
    : '2026-08-25T00:00:00.000Z';
  return {
    id: slot.id,
    provider: 'sportmonks',
    league: 'leagues-cup',
    date,
    scheduleDay: slot.boardDate ?? undefined,
    jornada: slot.stage,
    state: 'pre',
    statusLabel: 'Por definir',
    venue: slot.venueLabel,
    city: null,
    home: {
      id: 'tbc-h',
      name: slot.homeLabel,
      abbreviation: 'TBC',
      score: null,
    },
    away: {
      id: 'tbc-a',
      name: slot.awayLabel,
      abbreviation: 'TBC',
      score: null,
    },
    dondeVer: {
      mx: 'Apple TV',
      us: 'Apple TV',
      mxChannels: ['apple-tv'],
      usChannels: ['apple-tv'],
    },
  };
}

/** Official board + Sportmonks live state/scores. */
export function buildLeaguesCupBoard(smFixtures: Fixture[]): Fixture[] {
  const byId = new Map(smFixtures.map((f) => [f.id, f]));
  const phaseOne = LEAGUES_CUP_PHASE_ONE.map((kick) =>
    fixtureFromKick(kick, byId.get(String(kick.smId)))
  );
  const knockout = LEAGUES_CUP_KNOCKOUT.map(knockoutFixture);
  return [...phaseOne, ...knockout].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/** Board / UTC days that may have moved scores (livescores drop FT games). */
export function lcActiveDateKeys(now = Date.now()): string[] {
  const keys = new Set<string>();
  const afterMs = 6 * 60 * 60_000;
  for (const kick of LEAGUES_CUP_PHASE_ONE) {
    const iso = lcLocalToIso(kick.boardDate, kick.localTime, kick.tz);
    const kickAt = +new Date(iso);
    if (!Number.isFinite(kickAt)) continue;
    if (kickAt - now > FRESH.nearKickoffBeforeMs) continue;
    if (now - kickAt > afterMs) continue;
    keys.add(kick.boardDate);
    keys.add(new Date(iso).toISOString().slice(0, 10));
  }
  return [...keys];
}

/**
 * Official LC board with season schedule + date FT scores + livescores.
 * Use everywhere (SSR, fixtures API, standings) so tabla matches partidos.
 */
export async function fetchLeaguesCupLiveBoard(): Promise<{
  fixtures: Fixture[];
  source: 'official+sportmonks' | 'official';
}> {
  if (!sportmonksEnabled()) {
    return { fixtures: buildLeaguesCupBoard([]), source: 'official' };
  }

  const raw = await fetchLeaguesCupSeasonFixtures().catch(() => [] as Fixture[]);
  const now = Date.now();
  const lcId = leaguesCupLeagueId();

  const dated = (
    await Promise.all(
      lcActiveDateKeys(now).map((day) =>
        fetchFixturesByDate(day, [lcId]).catch(() => [] as Fixture[])
      )
    )
  ).flat();
  const withDated = dated.length ? overlayLiveFixtures(raw, dated) : raw;

  const board = buildLeaguesCupBoard(withDated);
  const playable = board.filter((f) => !f.id.startsWith('lc-'));
  const mayBeLive = playable.some(
    (f) => f.state === 'in' || isNearKickoff(f.date, now, f.state)
  );
  const live = mayBeLive
    ? await fetchLivescores([lcId]).catch(() => [] as Fixture[])
    : [];

  return {
    fixtures: live.length
      ? buildLeaguesCupBoard(overlayLiveFixtures(withDated, live))
      : board,
    source: 'official+sportmonks',
  };
}

/** Overlay official venue / kickoff / sides onto a single Sportmonks match snapshot. */
export function applyLeaguesCupOfficial(fixture: Fixture): Fixture {
  const kick = LEAGUES_CUP_PHASE_ONE.find((k) => String(k.smId) === fixture.id);
  if (!kick) return fixture;
  return fixtureFromKick(kick, fixture);
}

export function leaguesCupKnockoutSlots(): LcKnockoutSlot[] {
  return LEAGUES_CUP_KNOCKOUT;
}
