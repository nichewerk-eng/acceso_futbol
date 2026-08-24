import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getClubIdentity } from '../../config/clubIdentity';
import { buildLeaguesCupBoard } from './leaguesCupBoard';
import { fixturesForClub } from './clubBoard';
import { seedLigaMxFixtures } from './espnFallback';
import type { Fixture } from './types';

describe('fixturesForClub', () => {
  it('includes América Liga MX and Leagues Cup knockout on the same list', () => {
    const america = getClubIdentity('america');
    assert.ok(america);
    const liga = seedLigaMxFixtures().filter((f) => f.state === 'pre');
    const lc = buildLeaguesCupBoard([]);
    const mine = fixturesForClub(america, [...liga, ...lc]);
    const leagues = new Set(mine.map((f) => f.league));
    assert.ok(leagues.has('liga-mx'));
    assert.ok(leagues.has('leagues-cup'));
    assert.ok(mine.some((f) => f.id === 'lc-qf-4'));
    const dates = mine.map((f) => +new Date(f.date));
    assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
  });

  it('does not attach Chicago Fire Leagues Cup ties to Cruz Azul', () => {
    const cruz = getClubIdentity('cruz-azul');
    assert.ok(cruz);
    const lc = buildLeaguesCupBoard([]);
    const mine = fixturesForClub(cruz, lc);
    assert.ok(!mine.some((f: Fixture) => f.id === 'lc-qf-1'));
  });
});
