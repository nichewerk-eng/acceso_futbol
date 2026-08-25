import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankAccesoRoundTeams } from './accesoRound';

describe('rankAccesoRoundTeams', () => {
  it('puts a bottom-table 3-0 away win over a home 1-0 vs last', () => {
    const opp = new Map<string, number>([
      ['GDL', 0.62],
      ['ATS', 0.4],
      ['AME', 0.65],
      ['PUE', 0.38],
    ]);
    const places = new Map<string, number>([
      ['ATS', 15],
      ['GDL', 2],
      ['AME', 1],
      ['PUE', 18],
    ]);
    const ranked = rankAccesoRoundTeams(
      [
        {
          homeAbbr: 'GDL',
          awayAbbr: 'ATS',
          homeName: 'Guadalajara',
          awayName: 'Atlas',
          homeScore: 0,
          awayScore: 3,
        },
        {
          homeAbbr: 'AME',
          awayAbbr: 'PUE',
          homeName: 'América',
          awayName: 'Puebla',
          homeScore: 1,
          awayScore: 0,
        },
      ],
      opp,
      places
    );

    assert.equal(ranked[0].abbr, 'ATS');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].result, 'W');
    assert.match(ranked[0].why, /Ganó 3–0 visita vs GDL/);
    assert.ok(ranked[0].score > ranked.find((r) => r.abbr === 'AME')!.score);
  });

  it('ranks both sides of each match', () => {
    const ranked = rankAccesoRoundTeams(
      [
        {
          homeAbbr: 'TOL',
          awayAbbr: 'SAN',
          homeName: 'Toluca',
          awayName: 'Santos',
          homeScore: 2,
          awayScore: 2,
        },
      ],
      new Map(),
      new Map()
    );
    assert.equal(ranked.length, 2);
    assert.equal(ranked[0].result, 'D');
    assert.equal(ranked[1].result, 'D');
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[1].rank, 2);
  });
});
