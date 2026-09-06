import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLeaguesCupOfficial,
  buildLeaguesCupBoard,
  lcOnPartidosCalendar,
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
    winnerSide: extra.winnerSide ?? null,
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

  it('keeps a Próximo quarterfinal on the partidos calendar', () => {
    const board = buildLeaguesCupBoard([
      {
        ...smQf1(),
        id: '19868232',
        date: '2026-08-27T00:30:00.000Z',
        statusLabel: 'Próximo',
        home: team('TOL'),
        away: team('ATX'),
      },
    ]);
    const qf = board.find((f) => f.id === 'lc-qf-2');
    assert.ok(qf);
    assert.equal(qf.statusLabel, 'Próximo');
    assert.equal(lcOnPartidosCalendar(qf), true);
  });

  it('lists the Houston third-place and final on the partidos calendar', () => {
    const board = buildLeaguesCupBoard([]);
    const third = board.find((f) => f.id === 'lc-third');
    const final = board.find((f) => f.id === 'lc-final');
    assert.ok(third && final);
    assert.equal(third.home.abbreviation, 'LEO');
    assert.equal(third.away.abbreviation, 'AME');
    assert.equal(third.venue, 'Shell Energy Stadium');
    assert.equal(third.scheduleDay, '2026-09-06');
    assert.equal(third.jornada, 'Third Place Match');
    assert.equal(lcOnPartidosCalendar(third), true);
    assert.equal(final.home.abbreviation, 'TOL');
    assert.equal(final.away.abbreviation, 'MTY');
    assert.equal(final.venue, 'Shell Energy Stadium');
    assert.equal(final.scheduleDay, '2026-09-06');
    assert.equal(final.jornada, 'Final');
    assert.equal(lcOnPartidosCalendar(final), true);
    assert.deepEqual(third.dondeVer?.mxChannels, ['apple-tv', 'imagen-tv']);
    assert.deepEqual(final.dondeVer?.usChannels, ['apple-tv', 'univision']);
    assert.deepEqual(final.dondeVer?.mxChannels, ['apple-tv', 'imagen-tv']);
  });

  it('lists the official semis on the partidos calendar', () => {
    const board = buildLeaguesCupBoard([]);
    const sf1 = board.find((f) => f.id === 'lc-sf-1');
    const sf2 = board.find((f) => f.id === 'lc-sf-2');
    assert.ok(sf1 && sf2);
    assert.equal(sf1.home.abbreviation, 'TOL');
    assert.equal(sf1.away.abbreviation, 'LEO');
    assert.equal(sf1.venue, 'Shell Energy Stadium');
    assert.equal(sf1.scheduleDay, '2026-09-02');
    assert.equal(sf1.jornada, 'Semifinals');
    assert.equal(lcOnPartidosCalendar(sf1), true);
    assert.equal(sf2.home.abbreviation, 'AME');
    assert.equal(sf2.away.abbreviation, 'MTY');
    assert.equal(sf2.venue, 'Dignity Health Sports Park');
    assert.equal(sf2.scheduleDay, '2026-09-02');
    assert.equal(lcOnPartidosCalendar(sf2), true);
  });

  it('lists MX TV for the 2 sep semis', () => {
    const board = buildLeaguesCupBoard([]);
    const sf1 = board.find((f) => f.id === 'lc-sf-1');
    const sf2 = board.find((f) => f.id === 'lc-sf-2');
    assert.ok(sf1 && sf2);
    assert.deepEqual(sf1.dondeVer?.mxChannels, ['apple-tv', 'imagen-tv']);
    assert.deepEqual(sf2.dondeVer?.mxChannels, [
      'apple-tv',
      'imagen-tv',
      'tudn',
      'nueve',
    ]);
  });

  it('rewrites a Sportmonks QF snapshot onto the official slot', () => {
    const official = applyLeaguesCupOfficial(smQf1({ venue: 'Wrong venue' }));
    assert.equal(official.id, 'lc-qf-1');
    assert.equal(official.venue, 'SeatGeek Stadium');
    assert.equal(official.home.abbreviation, 'MTY');
  });

  it('advances QF winners into the semis as they finish', () => {
    const board = buildLeaguesCupBoard([
      smQf1({
        state: 'post',
        statusLabel: 'Final',
        winnerSide: 'home',
        home: team('MTY', { name: 'Monterrey', score: '2' }),
        away: team('CHI', { name: 'Chicago', score: '1' }),
      }),
      {
        id: '19868233',
        provider: 'sportmonks',
        league: 'leagues-cup',
        date: '2026-08-26T02:30:00.000Z',
        state: 'post',
        statusLabel: 'Final',
        winnerSide: 'home',
        home: team('LEO', { name: 'León', score: '3' }),
        away: team('RSL', { name: 'Salt Lake', score: '0' }),
      },
    ]);
    const sf1 = board.find((f) => f.id === 'lc-sf-1');
    const sf2 = board.find((f) => f.id === 'lc-sf-2');
    assert.ok(sf1 && sf2);
    assert.equal(sf1.home.abbreviation, 'TOL');
    assert.equal(sf1.away.abbreviation, 'LEO');
    assert.equal(sf2.home.abbreviation, 'AME');
    assert.equal(sf2.away.abbreviation, 'MTY');
    assert.equal(lcOnPartidosCalendar(sf1), true);
    const final = board.find((f) => f.id === 'lc-final');
    assert.equal(final?.home.abbreviation, 'TOL');
    assert.equal(final?.away.abbreviation, 'MTY');
  });

  it('names both semi sides once every quarterfinal is finished', () => {
    const qf = (
      id: string,
      home: string,
      away: string,
      hs: string,
      as: string
    ): Fixture => ({
      id,
      provider: 'sportmonks',
      league: 'leagues-cup',
      date: '2026-08-26T00:00:00.000Z',
      state: 'post',
      statusLabel: 'Final',
      winnerSide: Number(hs) > Number(as) ? 'home' : 'away',
      home: team(home, { name: home, score: hs }),
      away: team(away, { name: away, score: as }),
    });
    const board = buildLeaguesCupBoard([
      qf('19868234', 'MTY', 'CHI', '2', '1'),
      qf('19868232', 'TOL', 'ATX', '1', '0'),
      qf('19868233', 'LEO', 'RSL', '3', '0'),
      qf('19868231', 'AME', 'COL', '2', '1'),
    ]);
    const sf1 = board.find((f) => f.id === 'lc-sf-1');
    const sf2 = board.find((f) => f.id === 'lc-sf-2');
    assert.equal(sf1?.home.abbreviation, 'TOL');
    assert.equal(sf1?.away.abbreviation, 'LEO');
    assert.equal(sf2?.home.abbreviation, 'AME');
    assert.equal(sf2?.away.abbreviation, 'MTY');
    assert.equal(board.find((f) => f.id === 'lc-final')?.home.abbreviation, 'TOL');
    assert.equal(board.find((f) => f.id === 'lc-third')?.home.abbreviation, 'LEO');
  });

  it('fills Houston sides from finished semis', () => {
    const sf = (
      id: string,
      home: string,
      away: string,
      hs: string,
      as: string,
      winner: 'home' | 'away'
    ): Fixture => ({
      id,
      provider: 'sportmonks',
      league: 'leagues-cup',
      date: '2026-09-03T01:00:00.000Z',
      state: 'post',
      statusLabel: 'Final',
      winnerSide: winner,
      home: team(home, { name: home, score: hs }),
      away: team(away, { name: away, score: as }),
    });
    const board = buildLeaguesCupBoard([
      sf('lc-sf-1', 'TOL', 'LEO', '2', '0', 'home'),
      sf('lc-sf-2', 'AME', 'MTY', '2', '2', 'away'),
    ]);
    const third = board.find((f) => f.id === 'lc-third');
    const final = board.find((f) => f.id === 'lc-final');
    assert.equal(third?.home.abbreviation, 'LEO');
    assert.equal(third?.away.abbreviation, 'AME');
    assert.equal(final?.home.abbreviation, 'TOL');
    assert.equal(final?.away.abbreviation, 'MTY');
    assert.equal(lcOnPartidosCalendar(third!), true);
    assert.equal(lcOnPartidosCalendar(final!), true);
  });
});
