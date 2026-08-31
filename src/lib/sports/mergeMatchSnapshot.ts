import type { LiveEvent, MatchSnapshot } from './types';
import { pickComments } from './localizeComment';
import { applyVarNarrative } from './keyEvents';

function lineupPlayers(m: MatchSnapshot): number {
  return (m.lineups ?? []).reduce((n, t) => n + t.starters.length + t.bench.length, 0);
}

function formPlayers(m: MatchSnapshot): number {
  return (m.form?.home.length ?? 0) + (m.form?.away.length ?? 0);
}

function isScoreEvent(e: LiveEvent): boolean {
  return e.kind === 'goal' || e.kind === 'penalty' || e.kind === 'own_goal';
}

function pickEvents(
  prev: LiveEvent[] | undefined,
  next: LiveEvent[] | undefined
): LiveEvent[] {
  if (!next?.length) return prev ?? next ?? [];
  if (!prev?.length) return next;
  const nextAnulado = next.some((e) => e.type === 'Anulado' || e.kind === 'var');
  const prevGoals = prev.filter(isScoreEvent).length;
  const nextGoals = next.filter(isScoreEvent).length;
  if (nextAnulado && nextGoals < prevGoals) return next;
  if (next.some((e) => e.type === 'Anulado') && !prev.some((e) => e.type === 'Anulado')) {
    return next;
  }
  if (next.length >= prev.length) return next;
  return prev;
}

function pickScorers(
  prev: MatchSnapshot['scorers'],
  next: MatchSnapshot['scorers'],
  events: LiveEvent[] | undefined
): MatchSnapshot['scorers'] {
  if (!next?.length) return prev ?? next;
  if (!prev?.length) return next;
  if ((events ?? []).some((e) => e.type === 'Anulado') && next.length < prev.length) {
    return next;
  }
  return next.length >= prev.length ? next : prev;
}

/**
 * Keep the richest UX fields when a lean/live poll would wipe Contexto,
 * Alineación, Completa, or Datos. Scores/clock/state always come from `next`.
 */
export function mergeMatchSnapshot(
  prev: MatchSnapshot | null | undefined,
  next: MatchSnapshot
): MatchSnapshot {
  if (!prev || prev.id !== next.id) return applyVarNarrative(next);
  // Stale date-board ticks arrive as `pre` while the match is already live.
  // Never demote — that flashes the capítulo empty every poll.
  if (prev.state === 'in' && next.state === 'pre') return prev;

  return applyVarNarrative({
    ...next,
    form: formPlayers(next) > 0 ? next.form : prev.form,
    headToHead:
      (next.headToHead?.meetings.length ?? 0) > 0 ? next.headToHead : prev.headToHead,
    lineups: lineupPlayers(next) >= lineupPlayers(prev) ? next.lineups : prev.lineups,
    comments: (pickComments(prev.comments, next.comments) ?? []) as MatchSnapshot['comments'],
    stats:
      (next.stats?.length ?? 0) >= (prev.stats?.length ?? 0) ? next.stats : prev.stats,
    events: pickEvents(prev.events, next.events),
    scorers: pickScorers(prev.scorers, next.scorers, next.events),
    referee: next.referee || prev.referee,
  });
}
