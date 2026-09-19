import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Fixture } from './sports/types';
import { sportsEventItemListJsonLd, sportsEventJsonLd } from './seo';

function match(over: Partial<Fixture> = {}): Fixture {
  return {
    id: 'amp-gdl',
    provider: 'espn',
    league: 'liga-mx',
    date: '2026-09-19T02:00:00.000Z',
    state: 'pre',
    statusLabel: 'Scheduled',
    venue: 'Estadio Azteca',
    city: 'Ciudad de México',
    home: { id: '1', name: 'América', abbreviation: 'AME' },
    away: { id: '2', name: 'Guadalajara', abbreviation: 'GDL' },
    ...over,
  };
}

function asEvent(value: ReturnType<typeof sportsEventJsonLd>) {
  return value as typeof value & {
    url: string;
    endDate?: string;
    location: {
      '@type': string;
      name: string;
      address: { '@type': string; addressLocality?: string; addressCountry: string };
    };
    offers: { '@type': string; url: string };
    performer: { name: string }[];
  };
}

describe('sportsEventJsonLd', () => {
  it('fills the Event fields Google flags on the indexed homepage', () => {
    const event = asEvent(sportsEventJsonLd(match(), 'liga-mx'));
    assert.equal(event['@type'], 'SportsEvent');
    assert.match(event.url, /\/partido\/liga-mx\/amp-gdl$/);
    assert.ok(event.endDate);
    assert.equal(event.location['@type'], 'Place');
    assert.equal(event.location.address['@type'], 'PostalAddress');
    assert.equal(event.location.address.addressLocality, 'Ciudad de México');
    assert.equal(event.location.address.addressCountry, 'MX');
    assert.equal(event.offers['@type'], 'Offer');
    assert.equal(event.offers.url, event.url);
    assert.equal(event.performer.length, 2);
    assert.equal(event.performer[0].name, 'América');
    assert.equal(event.performer[1].name, 'Guadalajara');
  });

  it('still emits location when venue is missing', () => {
    const event = asEvent(sportsEventJsonLd(match({ venue: null, city: null }), 'liga-mx'));
    assert.equal(event.location.name, 'Estadio por confirmar');
    assert.equal(event.location.address['@type'], 'PostalAddress');
  });
});

describe('sportsEventItemListJsonLd', () => {
  it('puts url on each ListItem so nested Events keep a crawlable URL', () => {
    const list = sportsEventItemListJsonLd([match()], { name: 'Jornada' });
    const row = list.itemListElement[0];
    assert.equal(row['@type'], 'ListItem');
    assert.equal(row.url, row.item.url);
    assert.equal(row.item['@type'], 'SportsEvent');
  });
});
