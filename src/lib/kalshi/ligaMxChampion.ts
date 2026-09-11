import { LIGA_MX_CLUBS } from '@/config/clubs';
import {
  fetchKalshiMarkets,
  impliedYesProb,
  type KalshiMarket,
} from '@/lib/kalshi/client';
import { KALSHI_TO_CLUB_ID } from '@/lib/kalshi/clubs';

export const KALSHI_LIGA_MX_SERIES = 'KXLIGAMX';

export type KalshiChampionRow = {
  rank: number;
  clubId: string;
  name: string;
  abbreviation: string;
  ticker: string;
  /** 0–1 implied YES probability */
  prob: number;
  /** Percent for display, one decimal when < 10 */
  pctLabel: string;
  href: string;
};

export type KalshiChampionBoard = {
  seriesTicker: string;
  eventTicker: string;
  label: string;
  generatedAt: string;
  source: 'kalshi';
  rows: KalshiChampionRow[];
  kalshiHref: string;
};

function clubById(id: string) {
  return LIGA_MX_CLUBS.find((c) => c.id === id) ?? null;
}

function tickerSuffix(ticker: string): string | null {
  const parts = ticker.split('-');
  const last = parts[parts.length - 1];
  return last ? last.toUpperCase() : null;
}

function pctLabel(prob: number): string {
  const pct = prob * 100;
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function pickAperturaEvent(markets: KalshiMarket[]): string | null {
  const events = [...new Set(markets.map((m) => m.event_ticker).filter(Boolean))];
  const aper = events.find((e) => /APER/i.test(e));
  if (aper) return aper;
  const cla = events.find((e) => /CLA/i.test(e));
  if (cla) return cla;
  return events[0] ?? null;
}

function eventLabel(eventTicker: string): string {
  if (/APER/i.test(eventTicker)) return 'Campeón Apertura';
  if (/CLA/i.test(eventTicker)) return 'Campeón Clausura';
  return 'Campeón Liga MX';
}

export function buildLigaMxChampionBoard(
  markets: KalshiMarket[],
  now = new Date()
): KalshiChampionBoard | null {
  const eventTicker = pickAperturaEvent(markets);
  if (!eventTicker) return null;

  const scoped = markets.filter((m) => m.event_ticker === eventTicker);
  const rows: Omit<KalshiChampionRow, 'rank'>[] = [];

  for (const m of scoped) {
    const suffix = tickerSuffix(m.ticker);
    const clubId = suffix ? KALSHI_TO_CLUB_ID[suffix] : null;
    const club = clubId ? clubById(clubId) : null;
    const prob = impliedYesProb(m);
    if (!club || prob == null) continue;
    rows.push({
      clubId: club.id,
      name: club.name,
      abbreviation: club.abbreviation,
      ticker: m.ticker,
      prob,
      pctLabel: pctLabel(prob),
      href: `https://kalshi.com/markets/${KALSHI_LIGA_MX_SERIES.toLowerCase()}/${m.event_ticker.toLowerCase()}`,
    });
  }

  rows.sort((a, b) => b.prob - a.prob || a.name.localeCompare(b.name, 'es'));

  if (!rows.length) return null;

  return {
    seriesTicker: KALSHI_LIGA_MX_SERIES,
    eventTicker,
    label: eventLabel(eventTicker),
    generatedAt: now.toISOString(),
    source: 'kalshi',
    rows: rows.map((r, i) => ({ ...r, rank: i + 1 })),
    kalshiHref: `https://kalshi.com/markets/${KALSHI_LIGA_MX_SERIES.toLowerCase()}`,
  };
}

export async function fetchLigaMxChampionBoard(): Promise<KalshiChampionBoard | null> {
  const markets = await fetchKalshiMarkets({
    seriesTicker: KALSHI_LIGA_MX_SERIES,
    status: 'open',
  });
  return buildLigaMxChampionBoard(markets);
}
