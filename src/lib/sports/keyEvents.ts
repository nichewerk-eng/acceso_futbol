import type { CommentaryLine, LiveEvent, MatchSnapshot, TeamRef } from './types';

const DISALLOWED =
  /anulado|no fue gol|goal cancelled|disallowed|not a goal|no goal|var.?cancels/i;

function normName(s?: string | null): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function namesMatch(a?: string | null, b?: string | null): boolean {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function minuteOf(clock?: string, minute?: number): number | null {
  if (minute != null && Number.isFinite(minute)) return minute;
  const m = (clock ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function minutesClose(a: number | null, b: number | null, window = 3): boolean {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= window;
}

function playerFromDisallowed(text: string): string | undefined {
  const m =
    text.match(/anulado[^:]*:\s*([A-Za-zÀ-ÿ.\-'\s]+?)\s*\(/i) ||
    text.match(/var:\s*([A-Za-zÀ-ÿ.\-'\s]+?)\s*\(/i);
  const name = m?.[1]?.trim();
  return name || undefined;
}

function teamAbbrFromComment(
  text: string,
  home: TeamRef,
  away: TeamRef
): string | undefined {
  const m = text.match(/\(([^)]+)\)/);
  const club = m?.[1]?.trim();
  if (!club) return undefined;
  if (namesMatch(club, home.name) || namesMatch(club, home.abbreviation)) {
    return home.abbreviation;
  }
  if (namesMatch(club, away.name) || namesMatch(club, away.abbreviation)) {
    return away.abbreviation;
  }
  return undefined;
}

function disallowedComments(comments: CommentaryLine[] | undefined): CommentaryLine[] {
  return (comments ?? []).filter((c) => DISALLOWED.test(c.text ?? ''));
}

function commentFitsEvent(c: CommentaryLine, e: LiveEvent): number {
  const player = playerFromDisallowed(c.text) || '';
  const cMin = minuteOf(c.clock, c.minute);
  const eMin = minuteOf(e.clock, e.minute);
  let score = 0;
  if (namesMatch(e.playerName, player) || namesMatch(e.text, player)) score += 4;
  if (namesMatch(e.playerName, c.text) || namesMatch(c.text, e.playerName)) score += 3;
  if (minutesClose(cMin, eMin)) score += 2;
  return score;
}

function pickDisallowedFor(
  event: LiveEvent,
  rows: CommentaryLine[]
): CommentaryLine | undefined {
  let best: { c: CommentaryLine; score: number } | undefined;
  for (const c of rows) {
    const score = commentFitsEvent(c, event);
    if (score < 2) continue;
    if (!best || score > best.score) best = { c, score };
  }
  return best?.c;
}

function anuladoEvent(
  from: LiveEvent,
  comment: CommentaryLine,
  home: TeamRef,
  away: TeamRef
): LiveEvent {
  const player =
    from.playerName ||
    playerFromDisallowed(comment.text) ||
    from.text.replace(/^gol anulado[·\s]*/i, '').trim();
  return {
    ...from,
    type: 'Anulado',
    kind: 'var',
    text: player ? `Gol anulado · ${player}` : 'Gol anulado por el VAR',
    playerName: player || from.playerName,
    teamAbbr: from.teamAbbr || teamAbbrFromComment(comment.text, home, away),
  };
}

function syntheticAnulado(
  comment: CommentaryLine,
  home: TeamRef,
  away: TeamRef
): LiveEvent {
  const player = playerFromDisallowed(comment.text);
  const minute = minuteOf(comment.clock, comment.minute) ?? undefined;
  return {
    id: `var-${comment.id}`,
    period: minute != null && minute > 45 ? 2 : 1,
    clock: comment.clock?.trim() || (minute != null ? `${minute}'` : ''),
    minute,
    type: 'Anulado',
    kind: 'var',
    text: player ? `Gol anulado · ${player}` : comment.text.trim(),
    teamAbbr: teamAbbrFromComment(comment.text, home, away),
    playerName: player,
  };
}

function alreadyAnulado(events: LiveEvent[], comment: CommentaryLine): boolean {
  const player = playerFromDisallowed(comment.text);
  const cMin = minuteOf(comment.clock, comment.minute);
  return events.some((e) => {
    if (e.kind !== 'var' && e.type !== 'Anulado') return false;
    if (e.type !== 'Anulado' && !DISALLOWED.test(e.text)) return false;
    if (player && (namesMatch(e.playerName, player) || namesMatch(e.text, player))) {
      return true;
    }
    return minutesClose(minuteOf(e.clock, e.minute), cMin);
  });
}

/**
 * Clave is built from SM events. A VAR that takes a goal off the board
 * often arrives as `{ type: VAR, text: player }` — rewrite it from ESPN
 * Spanish PBP so Clave says the gol was anulado.
 */
export function applyVarNarrative(match: MatchSnapshot): MatchSnapshot {
  const comments = match.comments ?? [];
  const disallowed = disallowedComments(comments);
  if (disallowed.length === 0 && !(match.events ?? []).some((e) => e.kind === 'var')) {
    return match;
  }

  const used = new Set<string>();
  const events: LiveEvent[] = [];

  for (const e of match.events ?? []) {
    if (e.kind === 'goal' || e.kind === 'penalty' || e.kind === 'own_goal') {
      // SM sometimes leaves the gol up after VAR kills it. Drop it;
      // the VAR row (or a synthetic Anulado) carries the decision.
      if (pickDisallowedFor(e, disallowed)) continue;
    }

    if (e.kind === 'var') {
      const hit = pickDisallowedFor(e, disallowed);
      if (hit) {
        used.add(hit.id);
        events.push(anuladoEvent(e, hit, match.home, match.away));
        continue;
      }
    }

    events.push(e);
  }

  for (const c of disallowed) {
    if (used.has(c.id) || alreadyAnulado(events, c)) continue;
    events.push(syntheticAnulado(c, match.home, match.away));
    used.add(c.id);
  }

  const annulled = new Set(
    events
      .filter((e) => e.type === 'Anulado')
      .map((e) => normName(e.playerName))
      .filter(Boolean)
  );
  const scorers = (match.scorers ?? []).filter((s) => !annulled.has(normName(s.name)));

  return { ...match, events, scorers };
}
