import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { KalshiMarket } from './client';
import { buildLigaMxChampionBoard } from './ligaMxChampion';

function m(
  partial: Pick<KalshiMarket, 'ticker' | 'event_ticker' | 'yes_sub_title'> &
    Partial<KalshiMarket>
): KalshiMarket {
  return {
    title: partial.yes_sub_title ?? partial.ticker,
    status: 'active',
    last_price_dollars: '0.10',
    yes_bid_dollars: '0.09',
    yes_ask_dollars: '0.11',
    ...partial,
  };
}

describe('buildLigaMxChampionBoard', () => {
  it('prefers Apertura event and maps Kalshi suffixes to AF clubs', () => {
    const board = buildLigaMxChampionBoard([
      m({
        ticker: 'KXLIGAMX-27CLA-TOL',
        event_ticker: 'KXLIGAMX-27CLA',
        yes_sub_title: 'Toluca',
        last_price_dollars: '0.50',
        yes_bid_dollars: '0.48',
        yes_ask_dollars: '0.52',
      }),
      m({
        ticker: 'KXLIGAMX-27APER-TOL',
        event_ticker: 'KXLIGAMX-27APER',
        yes_sub_title: 'Toluca',
        last_price_dollars: '0.22',
        yes_bid_dollars: '0.20',
        yes_ask_dollars: '0.22',
      }),
      m({
        ticker: 'KXLIGAMX-27APER-CDG',
        event_ticker: 'KXLIGAMX-27APER',
        yes_sub_title: 'Guadalajara',
        last_price_dollars: '0.20',
        yes_bid_dollars: '0.19',
        yes_ask_dollars: '0.21',
      }),
      m({
        ticker: 'KXLIGAMX-27APER-ALA',
        event_ticker: 'KXLIGAMX-27APER',
        yes_sub_title: 'Atlante',
        last_price_dollars: '0.01',
        yes_bid_dollars: '0.01',
        yes_ask_dollars: '0.02',
      }),
      m({
        ticker: 'KXLIGAMX-27APER-ATL',
        event_ticker: 'KXLIGAMX-27APER',
        yes_sub_title: 'Atlas',
        last_price_dollars: '0.04',
        yes_bid_dollars: '0.03',
        yes_ask_dollars: '0.05',
      }),
    ]);

    assert.ok(board);
    assert.equal(board.eventTicker, 'KXLIGAMX-27APER');
    assert.equal(board.label, 'Campeón Apertura');
    assert.equal(board.rows.length, 4);
    assert.equal(board.rows[0].clubId, 'toluca');
    assert.equal(board.rows[1].clubId, 'chivas');
    assert.ok(board.rows.some((r) => r.clubId === 'atlante'));
    assert.ok(board.rows.some((r) => r.clubId === 'atlas'));
  });
});
