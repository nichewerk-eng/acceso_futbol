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
import { FRESH, isNearKickoff, looksStillLive } from './freshness';
import { scheduleAbbr } from './ligaMxAbbr';
import {
  fetchFixturesByDate,
  fetchLeaguesCupSeasonFixtures,
  fetchLivescores,
  leaguesCupLeagueId,
  livingRoomLeagueIds,
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

function channelsFor(listing: { us: TvChannelId[]; mx?: TvChannelId[] }): Fixture['dondeVer'] {
  const us = listing.us;
  const mx: TvChannelId[] = listing.mx ?? ['apple-tv'];
  return {
    mx: mx.map((id) => TV_CHANNELS[id].label).join(' · '),
    us: us.map((id) => TV_CHANNELS[id].label).join(' · '),
    mxChannels: mx,
    usChannels: us,
    confirmed: true,
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
    venueTz: kick.tz,
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

function knockoutSide(
  abbr: string | null,
  label: string,
  slotId: string,
  side: 'h' | 'a'
): TeamRef {
  if (abbr) return teamFromAbbr(abbr);
  return {
    id: `${slotId}-${side}`,
    name: label,
    abbreviation: 'TBD',
    score: null,
  };
}

function knockoutFixture(slot: LcKnockoutSlot): Fixture {
  const tz = slot.tz ?? 'America/New_York';
  const localTime = slot.localTime ?? '20:00';
  const date = slot.boardDate
    ? lcLocalToIso(slot.boardDate, localTime, tz)
    : '2026-08-25T00:00:00.000Z';
  const sidesSet = Boolean(slot.home && slot.away);
  const scheduled = sidesSet && Boolean(slot.localTime && slot.boardDate);
  return {
    id: slot.id,
    provider: 'sportmonks',
    league: 'leagues-cup',
    date,
    scheduleDay: slot.boardDate ?? undefined,
    venueTz: tz,
    jornada: slot.stage,
    state: 'pre',
    statusLabel: scheduled ? 'Programado' : sidesSet ? 'Por anunciar' : 'Por definir',
    venue: slot.venueLabel,
    city: null,
    home: knockoutSide(slot.home, slot.homeLabel, slot.id, 'h'),
    away: knockoutSide(slot.away, slot.awayLabel, slot.id, 'a'),
    dondeVer: channelsFor({
      us: slot.us ?? ['apple-tv'],
      mx: slot.mx,
    }),
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

const LC_LIVE_AFTER_MS = 6 * 60 * 60_000;

function collectLcDateKeys(now: number, pastAfterMs: number): string[] {
  const keys = new Set<string>();
  const add = (boardDate: string, localTime: string, tz: string) => {
    const iso = lcLocalToIso(boardDate, localTime, tz);
    const kickAt = +new Date(iso);
    if (!Number.isFinite(kickAt)) return;
    if (kickAt - now > FRESH.nearKickoffBeforeMs) return;
    if (now - kickAt > pastAfterMs) return;
    keys.add(boardDate);
    keys.add(new Date(iso).toISOString().slice(0, 10));
  };
  for (const kick of LEAGUES_CUP_PHASE_ONE) {
    add(kick.boardDate, kick.localTime, kick.tz);
  }
  for (const slot of LEAGUES_CUP_KNOCKOUT) {
    if (!slot.boardDate || !slot.localTime || !slot.tz) continue;
    add(slot.boardDate, slot.localTime, slot.tz);
  }
  return [...keys];
}

/** Board / UTC days that may have moved scores (livescores drop FT games). */
export function lcActiveDateKeys(now = Date.now()): string[] {
  return collectLcDateKeys(now, LC_LIVE_AFTER_MS);
}

/** Every official kick already played — FT backfill when the season dump is empty. */
function lcPlayedDateKeys(now = Date.now()): string[] {
  return collectLcDateKeys(now, Number.POSITIVE_INFINITY);
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
  const hasFt = raw.some((f) => f.state === 'post' && f.home.score != null);
  const dateKeys = hasFt ? lcActiveDateKeys(now) : lcPlayedDateKeys(now);

  const dated = (
    await Promise.all(
      dateKeys.map((day) => fetchFixturesByDate(day, [lcId]).catch(() => [] as Fixture[]))
    )
  ).flat();
  const withDated = dated.length ? overlayLiveFixtures(raw, dated) : raw;

  const board = buildLeaguesCupBoard(withDated);
  const playable = board.filter((f) => !f.id.startsWith('lc-'));
  const mayBeLive = playable.some(
    (f) => looksStillLive(f) || isNearKickoff(f.date, now, f.state)
  );
  // Shared living-room livescores (same sticky board as the home feeds); keep LC rows.
  const live = mayBeLive
    ? (await fetchLivescores(livingRoomLeagueIds()).catch(() => [] as Fixture[])).filter(
        (f) => f.league === 'leagues-cup'
      )
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
