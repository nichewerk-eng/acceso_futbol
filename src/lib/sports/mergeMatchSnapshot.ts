import type { MatchSnapshot } from './types';

function lineupPlayers(m: MatchSnapshot): number {
  return (m.lineups ?? []).reduce((n, t) => n + t.starters.length + t.bench.length, 0);
}

function formPlayers(m: MatchSnapshot): number {
  return (m.form?.home.length ?? 0) + (m.form?.away.length ?? 0);
}

/**
 * Keep the richest UX fields when a lean/live poll would wipe Contexto,
 * Alineación, Completa, or Datos. Scores/clock/state always come from `next`.
 */
export function mergeMatchSnapshot(
  prev: MatchSnapshot | null | undefined,
  next: MatchSnapshot
): MatchSnapshot {
  if (!prev || prev.id !== next.id) return next;
  // Stale date-board ticks arrive as `pre` while the match is already live.
  // Never demote — that flashes the capítulo empty every poll.
  if (prev.state === 'in' && next.state === 'pre') return prev;

  return {
    ...next,
    form: formPlayers(next) > 0 ? next.form : prev.form,
    headToHead:
      (next.headToHead?.meetings.length ?? 0) > 0 ? next.headToHead : prev.headToHead,
    lineups: lineupPlayers(next) >= lineupPlayers(prev) ? next.lineups : prev.lineups,
    comments:
      (next.comments?.length ?? 0) >= (prev.comments?.length ?? 0)
        ? next.comments
        : prev.comments,
    stats:
      (next.stats?.length ?? 0) >= (prev.stats?.length ?? 0) ? next.stats : prev.stats,
    events:
      (next.events?.length ?? 0) >= (prev.events?.length ?? 0) ? next.events : prev.events,
    scorers:
      (next.scorers?.length ?? 0) >= (prev.scorers?.length ?? 0) ? next.scorers : prev.scorers,
    referee: next.referee || prev.referee,
  };
}
