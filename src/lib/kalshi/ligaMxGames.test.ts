import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { KalshiMarket } from './client';
import {
  buildLigaMxGamesBoard,
  expectedEventTicker,
  kalshiDayToken,
  lookupKalshiMatchOdds,
} from './ligaMxGames';

function m(
  partial: Pick<KalshiMarket, 'ticker' | 'event_ticker' | 'yes_sub_title'> &
    Partial<KalshiMarket>
): KalshiMarket {
  return {
    title: partial.yes_sub_title ?? partial.ticker,
    status: 'active',
    last_price_dollars: '0.33',
    yes_bid_dollars: '0.32',
    yes_ask_dollars: '0.34',
    ...partial,
  };
}

describe('ligaMxGames', () => {
  it('indexes open game markets by Mexico day + home/away codes', () => {
    const event = 'KXLIGAMXGAME-26SEP11NCXPUE';
    const board = buildLigaMxGamesBoard([
      m({
        ticker: `${event}-NCX`,
        event_ticker: event,
        yes_sub_title: 'Necaxa',
        last_price_dollars: '0.48',
        yes_bid_dollars: '0.47',
        yes_ask_dollars: '0.49',
      }),
      m({
        ticker: `${event}-PUE`,
        event_ticker: event,
        yes_sub_title: 'Puebla',
        last_price_dollars: '0.28',
        yes_bid_dollars: '0.27',
        yes_ask_dollars: '0.29',
      }),
      m({
        ticker: `${event}-TIE`,
        event_ticker: event,
        yes_sub_title: 'Tie',
        last_price_dollars: '0.26',
        yes_bid_dollars: '0.25',
        yes_ask_dollars: '0.27',
      }),
    ]);

    assert.equal(kalshiDayToken('2026-09-11T20:00:00-05:00'), '26SEP11');
    assert.equal(expectedEventTicker('26SEP11', 'NCX', 'PUE'), event);

    const odds = lookupKalshiMatchOdds(board, '2026-09-11T20:00:00-05:00', 'NCX', 'PUE');
    assert.ok(odds);
    assert.equal(odds.eventTicker, event);
    assert.equal(odds.homePct, '48%');
    assert.equal(odds.awayPct, '28%');
    assert.equal(odds.drawPct, '26%');
  });
});
