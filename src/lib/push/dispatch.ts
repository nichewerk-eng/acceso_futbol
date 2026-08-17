import { clubById, gravityMatches } from '@/config/clubMatch';
import { leaguePath } from '@/lib/radio/phases';
import { kvGetJson, kvSetJson, kvSetNx, sharedKvEnabled } from '@/lib/sharedKv';
import { getGamesOfDay, type DayGame } from '@/lib/sports/gamesOfDay';
import { matchAlerts, numScore, stabilizeAlertSnap, type AlertSnap } from './matchAlerts';
import { pushConfigured, sendWebPush, type PushPayload } from './send';
import { listSubs, removeSubById, type PushSub } from './store';

/**
 * Server-authoritative push dispatch. Mirrors the client gravity watcher
 * (`useGravityAlerts`) — kickoff + goal deltas — but diffs against a snapshot
 * persisted in KV so pushes fire even when no tab is open. Meant to run on a
 * ~1-minute cron. First run for any fixture only primes the snapshot.
 */

const STATE_KEY = 'push:board-state';
const STATE_TTL_MS = 6 * 60 * 60_000;
const LOCK_KEY = 'push:dispatch-lock';
const LOCK_MS = 55_000;

type StateMap = Record<string, AlertSnap>;

function snapOf(g: DayGame): AlertSnap {
  return { state: g.state, hs: numScore(g.home.score), as: numScore(g.away.score) };
}

interface PushEvent {
  game: DayGame;
  payload: PushPayload;
}

function buildEvents(games: DayGame[], prev: StateMap): { events: PushEvent[]; next: StateMap } {
  const next: StateMap = {};
  const events: PushEvent[] = [];
  for (const g of games) {
    const before = prev[g.id];
    const cur = stabilizeAlertSnap(before, snapOf(g));
    next[g.id] = cur;
    if (!before) continue; // prime only — never alert on first sighting
    const url = `/partido/${leaguePath(g.league)}/${g.id}`;
    const pair = `${g.home.abbreviation} vs ${g.away.abbreviation}`;
    for (const kind of matchAlerts(before, cur, g.date)) {
      if (kind === 'kickoff') {
        events.push({
          game: g,
          payload: { title: 'Arranca tu partido', body: pair, tag: `af-kick-${g.id}`, url },
        });
      } else {
        events.push({
          game: g,
          payload: {
            title: `GOL · ${g.home.abbreviation} ${cur.hs}-${cur.as} ${g.away.abbreviation}`,
            body: pair,
            tag: `af-gol-${g.id}-${cur.hs}-${cur.as}`,
            url,
          },
        });
      }
    }
  }
  return { events, next };
}

function subMatchesGame(sub: PushSub, g: DayGame): boolean {
  return gravityMatches(
    clubById(sub.clubId),
    sub.elTri,
    g.home.name,
    g.away.name,
    g.home.abbreviation,
    g.away.abbreviation
  );
}

export interface DispatchResult {
  ok: boolean;
  skipped?: string;
  games: number;
  events: number;
  sent: number;
  pruned: number;
  subs: number;
}

const EMPTY = (skipped: string): DispatchResult => ({
  ok: skipped === 'locked',
  skipped,
  games: 0,
  events: 0,
  sent: 0,
  pruned: 0,
  subs: 0,
});

export async function dispatchPush(opts?: { force?: boolean; dry?: boolean }): Promise<DispatchResult> {
  if (!pushConfigured()) return { ...EMPTY('push_not_configured'), ok: false };

  // One dispatcher at a time when KV is on (overlapping cron ticks / traffic).
  if (sharedKvEnabled() && !opts?.force) {
    const got = await kvSetNx(LOCK_KEY, '1', LOCK_MS);
    if (!got) return EMPTY('locked');
  }

  const payload = await getGamesOfDay();
  const games = payload.games;
  const prev = (await kvGetJson<StateMap>(STATE_KEY))?.data ?? {};
  const { events, next } = buildEvents(games, prev);
  await kvSetJson(STATE_KEY, next, STATE_TTL_MS);

  if (!events.length) {
    return { ok: true, games: games.length, events: 0, sent: 0, pruned: 0, subs: 0 };
  }

  const subs = await listSubs();
  let sent = 0;
  let pruned = 0;
  for (const ev of events) {
    const targets = subs.filter(({ sub }) => subMatchesGame(sub, ev.game));
    for (const { id, sub } of targets) {
      if (opts?.dry) {
        sent += 1;
        continue;
      }
      const res = await sendWebPush(sub, ev.payload);
      if (res === 'ok') sent += 1;
      else if (res === 'gone') {
        await removeSubById(id);
        pruned += 1;
      }
    }
  }

  return { ok: true, games: games.length, events: events.length, sent, pruned, subs: subs.length };
}
