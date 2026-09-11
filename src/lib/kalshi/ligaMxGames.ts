import { ligaMxClubIdFromAbbr } from '@/config/ligaMxLogos';
import { mexicoDayKey } from '@/lib/radio/phases';
import {
  fetchKalshiMarkets,
  impliedYesProb,
  type KalshiMarket,
} from '@/lib/kalshi/client';
import { CLUB_ID_TO_KALSHI, KALSHI_TO_CLUB_ID } from '@/lib/kalshi/clubs';

export const KALSHI_LIGA_MX_GAME_SERIES = 'KXLIGAMXGAME';

export type KalshiMatchOdds = {
  eventTicker: string;
  homeCode: string;
  awayCode: string;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  homePct: string;
  drawPct: string;
  awayPct: string;
  href: string;
};

export type KalshiGamesBoard = {
  seriesTicker: string;
  generatedAt: string;
  source: 'kalshi';
  /** Key: `${mexicoDay}|${homeKalshi}|${awayKalshi}` */
  byPair: Record<string, KalshiMatchOdds>;
  /** Key: event ticker */
  byEvent: Record<string, KalshiMatchOdds>;
};

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

function pctLabel(prob: number): string {
  const pct = prob * 100;
  if (pct > 0 && pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

export function kalshiCodeFromAbbr(abbr?: string | null): string | null {
  if (!abbr) return null;
  const clubId = ligaMxClubIdFromAbbr(abbr);
  if (!clubId) return null;
  return CLUB_ID_TO_KALSHI[clubId] ?? null;
}

export function kalshiDayToken(dateIso: string): string | null {
  try {
    const day = mexicoDayKey(new Date(dateIso));
    const [y, m, d] = day.split('-');
    if (!y || !m || !d) return null;
    const mon = MONTHS[Number(m) - 1];
    if (!mon) return null;
    return `${y.slice(2)}${mon}${d}`;
  } catch {
    return null;
  }
}

export function pairKey(dayToken: string, homeCode: string, awayCode: string): string {
  return `${dayToken}|${homeCode}|${awayCode}`;
}

export function expectedEventTicker(
  dayToken: string,
  homeCode: string,
  awayCode: string
): string {
  return `${KALSHI_LIGA_MX_GAME_SERIES}-${dayToken}${homeCode}${awayCode}`;
}

function parseEventTeams(eventTicker: string): {
  dayToken: string;
  homeCode: string;
  awayCode: string;
} | null {
  const prefix = `${KALSHI_LIGA_MX_GAME_SERIES}-`;
  if (!eventTicker.startsWith(prefix)) return null;
  const rest = eventTicker.slice(prefix.length);
  // 26SEP11NCXPUE → day 7 chars (2 digit year + 3 mon + 2 day) + 3 + 3
  if (rest.length < 13) return null;
  const dayToken = rest.slice(0, 7);
  const teams = rest.slice(7);
  if (teams.length !== 6) return null;
  const homeCode = teams.slice(0, 3).toUpperCase();
  const awayCode = teams.slice(3, 6).toUpperCase();
  if (!KALSHI_TO_CLUB_ID[homeCode] || !KALSHI_TO_CLUB_ID[awayCode]) return null;
  return { dayToken, homeCode, awayCode };
}

function outcomeSuffix(ticker: string, eventTicker: string): string | null {
  if (!ticker.startsWith(`${eventTicker}-`)) return null;
  return ticker.slice(eventTicker.length + 1).toUpperCase();
}

function buildOdds(
  eventTicker: string,
  homeCode: string,
  awayCode: string,
  markets: KalshiMarket[]
): KalshiMatchOdds | null {
  let homeProb: number | null = null;
  let awayProb: number | null = null;
  let drawProb: number | null = null;

  for (const m of markets) {
    const suf = outcomeSuffix(m.ticker, eventTicker);
    const p = impliedYesProb(m);
    if (!suf || p == null) continue;
    if (suf === 'TIE') drawProb = p;
    else if (suf === homeCode) homeProb = p;
    else if (suf === awayCode) awayProb = p;
  }

  if (homeProb == null || awayProb == null || drawProb == null) return null;

  return {
    eventTicker,
    homeCode,
    awayCode,
    homeProb,
    drawProb,
    awayProb,
    homePct: pctLabel(homeProb),
    drawPct: pctLabel(drawProb),
    awayPct: pctLabel(awayProb),
    href: `https://kalshi.com/markets/${KALSHI_LIGA_MX_GAME_SERIES.toLowerCase()}/${eventTicker.toLowerCase()}`,
  };
}

export function buildLigaMxGamesBoard(
  markets: KalshiMarket[],
  now = new Date()
): KalshiGamesBoard {
  const byEventMarkets = new Map<string, KalshiMarket[]>();
  for (const m of markets) {
    const et = m.event_ticker;
    if (!et) continue;
    const list = byEventMarkets.get(et) ?? [];
    list.push(m);
    byEventMarkets.set(et, list);
  }

  const byPair: Record<string, KalshiMatchOdds> = {};
  const byEvent: Record<string, KalshiMatchOdds> = {};

  for (const [eventTicker, ms] of byEventMarkets) {
    const parsed = parseEventTeams(eventTicker);
    if (!parsed) continue;
    const odds = buildOdds(eventTicker, parsed.homeCode, parsed.awayCode, ms);
    if (!odds) continue;
    byEvent[eventTicker] = odds;
    byPair[pairKey(parsed.dayToken, parsed.homeCode, parsed.awayCode)] = odds;
  }

  return {
    seriesTicker: KALSHI_LIGA_MX_GAME_SERIES,
    generatedAt: now.toISOString(),
    source: 'kalshi',
    byPair,
    byEvent,
  };
}

export function lookupKalshiMatchOdds(
  board: KalshiGamesBoard | null | undefined,
  dateIso: string,
  homeAbbr: string,
  awayAbbr: string
): KalshiMatchOdds | null {
  if (!board) return null;
  const home = kalshiCodeFromAbbr(homeAbbr);
  const away = kalshiCodeFromAbbr(awayAbbr);
  const day = kalshiDayToken(dateIso);
  if (!home || !away || !day) return null;

  const direct = board.byPair[pairKey(day, home, away)];
  if (direct) return direct;

  const et = expectedEventTicker(day, home, away);
  return board.byEvent[et] ?? null;
}

export async function fetchLigaMxGamesBoard(): Promise<KalshiGamesBoard> {
  const markets = await fetchKalshiMarkets({
    seriesTicker: KALSHI_LIGA_MX_GAME_SERIES,
    status: 'open',
  });
  return buildLigaMxGamesBoard(markets);
}
