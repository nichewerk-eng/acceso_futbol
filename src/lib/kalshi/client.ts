/** Public Kalshi Trade API — market data needs no auth. */
const KALSHI_BASE = 'https://external-api.kalshi.com/trade-api/v2';

export type KalshiMarket = {
  ticker: string;
  event_ticker: string;
  title: string;
  status: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  last_price_dollars?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  volume_fp?: string;
  volume_24h_fp?: string;
  rules_primary?: string;
};

type MarketsResponse = {
  markets?: KalshiMarket[];
  cursor?: string;
};

export async function fetchKalshiMarkets(opts: {
  seriesTicker: string;
  status?: 'open' | 'closed' | 'settled';
  limit?: number;
  signal?: AbortSignal;
}): Promise<KalshiMarket[]> {
  const out: KalshiMarket[] = [];
  let cursor: string | undefined;
  const limit = Math.min(opts.limit ?? 200, 200);

  do {
    const url = new URL(`${KALSHI_BASE}/markets`);
    url.searchParams.set('series_ticker', opts.seriesTicker);
    url.searchParams.set('limit', String(limit));
    if (opts.status) url.searchParams.set('status', opts.status);
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url, {
      signal: opts.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`Kalshi markets ${res.status}`);
    }
    const body = (await res.json()) as MarketsResponse;
    out.push(...(body.markets ?? []));
    cursor = body.cursor || undefined;
    if (!body.markets?.length) break;
  } while (cursor && out.length < 500);

  return out;
}

export function dollarsToProb(raw?: string | null): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(1, n);
}

/** Mid of bid/ask when both sides exist; else last / ask / bid. */
export function impliedYesProb(m: KalshiMarket): number | null {
  const bid = dollarsToProb(m.yes_bid_dollars);
  const ask = dollarsToProb(m.yes_ask_dollars);
  const last = dollarsToProb(m.last_price_dollars);
  if (bid != null && ask != null && bid > 0 && ask > 0) return (bid + ask) / 2;
  if (last != null && last > 0) return last;
  if (ask != null && ask > 0) return ask;
  if (bid != null && bid > 0) return bid;
  return last;
}
