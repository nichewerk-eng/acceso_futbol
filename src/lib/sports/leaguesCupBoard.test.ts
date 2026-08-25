import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLeaguesCupOfficial,
  buildLeaguesCupBoard,
  officialLeaguesCupMatch,
  resolveLeaguesCupSmId,
} from './leaguesCupBoard';
import type { Fixture, TeamRef } from './types';

function team(abbr: string, extra: Partial<TeamRef> = {}): TeamRef {
  return {
    id: extra.id ?? abbr,
    name: extra.name ?? abbr,
    abbreviation: abbr,
    score: extra.score ?? null,
  };
}

function smQf1(extra: Partial<Fixture> = {}): Fixture {
  return {
    id: '19868234',
    provider: 'sportmonks',
    league: 'leagues-cup',
    date: '2026-08-26T00:30:00.000Z',
    state: extra.state ?? 'pre',
    statusLabel: extra.statusLabel ?? 'Programado',
    clock: extra.clock,
    venue: extra.venue ?? 'SM venue',
    home: extra.home ?? team('MTY'),
    away: extra.away ?? team('CHI'),
  };
}

describe('leagues cup knockout board', () => {
  it('serves Monterrey–Chicago as lc-qf-1 without Sportmonks', () => {
    const match = officialLeaguesCupMatch('lc-qf-1');
    assert.ok(match);
    assert.equal(match.id, 'lc-qf-1');
    assert.equal(match.home.abbreviation, 'MTY');
    assert.equal(match.away.abbreviation, 'CHI');
    assert.equal(match.venue, 'SeatGeek Stadium');
    assert.equal(match.state, 'pre');
  });

  it('maps lc-qf-1 to the Sportmonks fixture id', () => {
    assert.equal(resolveLeaguesCupSmId('lc-qf-1'), '19868234');
    assert.equal(resolveLeaguesCupSmId('19868234'), '19868234');
  });

  it('keeps the board URL id when overlaying a live Sportmonks row', () => {
    const board = buildLeaguesCupBoard([
      smQf1({
        state: 'in',
        statusLabel: 'En vivo',
        clock: "32'",
        home: team('MTY', { id: '2662', name: 'Monterrey', score: '1' }),
        away: team('CHI', { id: '75', name: 'Chicago Fire', score: '0' }),
      }),
    ]);
    const qf = board.find((f) => f.id === 'lc-qf-1');
    assert.ok(qf);
    assert.equal(qf.state, 'in');
    assert.equal(qf.home.score, '1');
    assert.equal(qf.away.score, '0');
    assert.equal(qf.venue, 'SeatGeek Stadium');
  });

  it('rewrites a Sportmonks QF snapshot onto the official slot', () => {
    const official = applyLeaguesCupOfficial(smQf1({ venue: 'Wrong venue' }));
    assert.equal(official.id, 'lc-qf-1');
    assert.equal(official.venue, 'SeatGeek Stadium');
    assert.equal(official.home.abbreviation, 'MTY');
  });
});
