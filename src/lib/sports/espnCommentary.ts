import { getCache, setCache } from '@/lib/apiCache';
import { espnFetch, scoreboardUrl, summaryUrl, SLUG } from '@/lib/espn';
import { mexicoDayKey } from '@/lib/radio/phases';
import { FRESH } from './freshness';
import { scheduleAbbr } from './ligaMxAbbr';
import type { CommentaryLine, MatchSnapshot } from './types';

type EspnCommentaryRow = {
  sequence?: number;
  time?: { value?: number; displayValue?: string };
  text?: string;
};

type EspnBoardEvent = {
  id: string;
  date: string;
  competitions?: {
    competitors?: {
      homeAway: 'home' | 'away';
      team?: { abbreviation?: string; displayName?: string };
    }[];
  }[];
};

function parseClockMinute(display?: string): number | undefined {
  if (!display) return undefined;
  const m = display.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

function normAbbr(a?: string | null) {
  return scheduleAbbr(a ?? '');
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Map ESPN Spanish commentary package → Acceso lines. */
export function mapEspnCommentary(rows: EspnCommentaryRow[] | undefined): CommentaryLine[] {
  return (rows ?? [])
    .map((c, i) => {
      const text = (c.text ?? '').trim();
      const clock = c.time?.displayValue?.trim() || undefined;
      return {
        id: String(c.sequence ?? i),
        minute: parseClockMinute(clock),
        clock,
        order: c.sequence ?? i,
        text,
        isGoal: /¡?go+l|gol de|goal!/i.test(text),
      };
    })
    .filter((c) => c.text)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

async function boardForDay(dayKey: string): Promise<EspnBoardEvent[]> {
  const cacheKey = `espn-board-es-${dayKey}`;
  const cached = getCache<EspnBoardEvent[]>(cacheKey, FRESH.apiTtlMs * 3);
  if (cached) return cached;
  const ymd = dayKey.replace(/-/g, '');
  try {
    const raw = (await espnFetch(scoreboardUrl(SLUG.LIGA_MX, ymd, 50, 'es'), {
      revalidate: false,
    })) as { events?: EspnBoardEvent[] };
    const events = raw.events ?? [];
    setCache(cacheKey, events);
    return events;
  } catch {
    return [];
  }
}

/** Resolve ESPN mex.1 event id from a Sportmonks (or other) match snapshot. */
export async function resolveEspnLigaMxEventId(
  match: Pick<MatchSnapshot, 'date' | 'home' | 'away' | 'id'>
): Promise<string | null> {
  if (/^401\d{6,}$/.test(match.id)) return match.id;

  const dayKey = mexicoDayKey(new Date(match.date));
  const next = new Date(`${dayKey}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextKey = next.toISOString().slice(0, 10);
  const prev = new Date(`${dayKey}T12:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  const prevKey = prev.toISOString().slice(0, 10);

  const home = normAbbr(match.home.abbreviation);
  const away = normAbbr(match.away.abbreviation);

  for (const day of [dayKey, nextKey, prevKey]) {
    const events = await boardForDay(day);
    for (const e of events) {
      const comps = e.competitions?.[0]?.competitors ?? [];
      const h = comps.find((c) => c.homeAway === 'home') ?? comps[0];
      const a = comps.find((c) => c.homeAway === 'away') ?? comps[1];
      const eh = normAbbr(h?.team?.abbreviation);
      const ea = normAbbr(a?.team?.abbreviation);
      if (eh === home && ea === away) return e.id;
    }
  }
  return null;
}

function shouldPreferEspn(comments: CommentaryLine[], match: MatchSnapshot): boolean {
  const smCount = match.comments?.length ?? 0;
  if (comments.length === 0) return false;
  const smEnglish =
    smCount > 0 &&
    (match.comments ?? [])
      .slice(0, 8)
      .filter((c) => /\b(Goal!|Shot |Yellow card|Corner|VAR)\b/i.test(c.text)).length >= 2;
  return comments.length >= smCount || smEnglish || smCount < 12;
}

async function fetchEspnComments(espnId: string, live: boolean): Promise<CommentaryLine[]> {
  const raw = (await espnFetch(summaryUrl(SLUG.LIGA_MX, espnId, 'es'), {
    revalidate: live ? false : 15,
  })) as { commentary?: EspnCommentaryRow[] };
  return mapEspnCommentary(raw.commentary);
}

/**
 * Prefer ESPN Spanish play-by-play for Completa when Sportmonks commentary is thin/English.
 * Never blocks live scores longer than `budgetMs` — falls back to cached ESPN or SM.
 */
export async function enrichMatchWithEspnCommentary(
  match: MatchSnapshot,
  opts?: { budgetMs?: number }
): Promise<MatchSnapshot> {
  const cacheKey = `espn-cronica-v1-${match.id}`;
  const cached = getCache<CommentaryLine[]>(cacheKey, FRESH.espnCronicaTtlMs);
  const budget =
    opts?.budgetMs ??
    (match.state === 'in' ? FRESH.espnEnrichBudgetMs : FRESH.espnEnrichBudgetIdleMs);

  const work = (async (): Promise<MatchSnapshot> => {
    const espnId = await resolveEspnLigaMxEventId(match);
    if (!espnId) return match;

    const comments = await fetchEspnComments(espnId, match.state === 'in');
    if (!shouldPreferEspn(comments, match)) return match;

    setCache(cacheKey, comments);
    return { ...match, comments };
  })();

  try {
    const raced = await Promise.race([
      work.then((m) => ({ ok: true as const, m })),
      sleep(budget).then(() => ({ ok: false as const })),
    ]);

    if (raced.ok) return raced.m;

    // Budget exceeded: serve last ESPN cronica if any; keep pulling in background.
    void work.catch(() => undefined);
    if (cached && shouldPreferEspn(cached, match)) {
      return { ...match, comments: cached };
    }
  } catch {
    if (cached && shouldPreferEspn(cached, match)) {
      return { ...match, comments: cached };
    }
  }
  return match;
}
