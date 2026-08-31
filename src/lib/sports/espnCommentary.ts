import { getCache, peekCache, peekCacheAgeMs, setCache } from '@/lib/apiCache';
import { espnFetch, scoreboardUrl, summaryUrl, SLUG } from '@/lib/espn';
import { mexicoDayKey } from '@/lib/radio/phases';
import { FRESH } from './freshness';
import { scheduleAbbr } from './ligaMxAbbr';
import {
  localizeComment,
  commentLooksEnglishPbp,
  commentLooksLikeGoal,
  preferEspnLang,
} from './localizeComment';
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

/** Map ESPN commentary → Acceso lines. Spanish stays as ESPN wrote it. */
export function mapEspnCommentary(rows: EspnCommentaryRow[] | undefined): CommentaryLine[] {
  return (rows ?? [])
    .map((c, i) => {
      const raw = (c.text ?? '').trim();
      const text = commentLooksEnglishPbp(raw) ? localizeComment(raw) : raw;
      const clock = c.time?.displayValue?.trim() || undefined;
      return {
        id: String(c.sequence ?? i),
        minute: parseClockMinute(clock),
        clock,
        order: c.sequence ?? i,
        text,
        isGoal: commentLooksLikeGoal(text),
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

const ESPN_ID_TTL_MS = 6 * 60 * 60_000;

/** Resolve ESPN mex.1 event id from a Sportmonks (or other) match snapshot. */
export async function resolveEspnLigaMxEventId(
  match: Pick<MatchSnapshot, 'date' | 'home' | 'away' | 'id'>
): Promise<string | null> {
  if (/^401\d{6,}$/.test(match.id)) return match.id;

  const idKey = `espn-mx-id-${match.id}`;
  const cachedId = getCache<string>(idKey, ESPN_ID_TTL_MS);
  if (cachedId) return cachedId;

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
      if (eh === home && ea === away) {
        setCache(idKey, e.id);
        return e.id;
      }
    }
  }
  return null;
}

function shouldPreferEspn(comments: CommentaryLine[], match: MatchSnapshot): boolean {
  const smCount = match.comments?.length ?? 0;
  if (comments.length === 0) return false;
  const espnEnglish = comments.filter((c) => commentLooksEnglishPbp(c.text)).length;
  const espnSpanish = comments.length - espnEnglish;
  // Spanish ESPN PBP beats a denser English wire every time.
  if (espnSpanish >= 3 && espnSpanish > espnEnglish) return true;
  const smEnglish =
    smCount > 0 &&
    (match.comments ?? []).slice(0, 8).filter((c) => commentLooksEnglishPbp(c.text)).length >= 2;
  return comments.length >= smCount || smEnglish || smCount < 12;
}

const espnWorkInflight = new Map<string, Promise<MatchSnapshot>>();

function runEspnWork(key: string, fn: () => Promise<MatchSnapshot>): Promise<MatchSnapshot> {
  const existing = espnWorkInflight.get(key);
  if (existing) return existing;
  const pending = fn().finally(() => espnWorkInflight.delete(key));
  espnWorkInflight.set(key, pending);
  return pending;
}

async function fetchEspnComments(
  espnId: string,
  live: boolean,
  lang: 'es' | 'en'
): Promise<CommentaryLine[]> {
  const raw = (await espnFetch(summaryUrl(SLUG.LIGA_MX, espnId, lang), {
    revalidate: live ? false : 15,
  })) as { commentary?: EspnCommentaryRow[] };
  return mapEspnCommentary(raw.commentary);
}

/** Spanish ESPN PBP first. English only when the Spanish package is thin. */
async function bestEspnComments(espnId: string, live: boolean): Promise<CommentaryLine[]> {
  const es = await fetchEspnComments(espnId, live, 'es');
  if (es.length >= 3) return es;
  const en = await fetchEspnComments(espnId, live, 'en');
  return preferEspnLang(es, en);
}

const cronicaKey = (id: string) => `espn-cronica-v3-es-${id}`;

/**
 * Prefer ESPN Spanish play-by-play for Completa.
 * Live: never delete last Spanish lines — serve them immediately and
 * refresh in the background so Completa does not stall or fall back to English.
 */
export async function enrichMatchWithEspnCommentary(
  match: MatchSnapshot,
  opts?: { budgetMs?: number }
): Promise<MatchSnapshot> {
  const cacheKey = cronicaKey(match.id);
  const ttl = match.state === 'in' ? FRESH.espnCronicaTtlLiveMs : FRESH.espnCronicaTtlMs;
  const age = peekCacheAgeMs(cacheKey);
  const held = peekCache<CommentaryLine[]>(cacheKey);
  const fresh = held != null && age != null && age <= ttl;
  const usable = held && shouldPreferEspn(held, match) ? held : null;

  const work = () =>
    runEspnWork(cacheKey, async () => {
      const espnId = await resolveEspnLigaMxEventId(match);
      if (!espnId) return usable ? { ...match, comments: usable } : match;
      const comments = await bestEspnComments(espnId, match.state === 'in');
      if (!shouldPreferEspn(comments, match)) {
        return usable ? { ...match, comments: usable } : match;
      }
      setCache(cacheKey, comments);
      return { ...match, comments };
    });

  if (usable) {
    if (!fresh) void work().catch(() => undefined);
    return { ...match, comments: usable };
  }

  const budget =
    opts?.budgetMs ??
    (match.state === 'in' ? FRESH.espnEnrichBudgetFirstMs : FRESH.espnEnrichBudgetIdleMs);

  try {
    const raced = await Promise.race([
      work().then((m) => ({ ok: true as const, m })),
      sleep(budget).then(() => ({ ok: false as const })),
    ]);

    if (raced.ok) return raced.m;

    void work().catch(() => undefined);
    const stale = peekCache<CommentaryLine[]>(cacheKey);
    if (stale && shouldPreferEspn(stale, match)) {
      return { ...match, comments: stale };
    }
  } catch {
    const stale = peekCache<CommentaryLine[]>(cacheKey);
    if (stale && shouldPreferEspn(stale, match)) {
      return { ...match, comments: stale };
    }
  }
  return match;
}
