import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accesoIndex,
  bandsForFormation,
  pickAccesoXi,
  ppgToOpp,
  shrinkOpp,
  teamPerformanceScore,
  type AccesoPoolPlayer,
} from './accesoIndex';

describe('teamPerformanceScore', () => {
  it('punishes a 3-0 loss vs a strong side', () => {
    const t = teamPerformanceScore(-3, 0.56);
    assert.ok(t < 5.2, `T=${t}`);
    assert.ok(t > 4.5, `T=${t}`);
  });

  it('rewards a 3-0 win vs a weak side without going to 10', () => {
    const t = teamPerformanceScore(3, 0.44);
    assert.ok(t > 7.8, `T=${t}`);
    assert.ok(t < 8.3, `T=${t}`);
  });

  it('caps a 5-1 vs a 1-0', () => {
    const blowout = teamPerformanceScore(4, 0.5);
    const narrow = teamPerformanceScore(1, 0.5);
    assert.ok(blowout > narrow);
    assert.ok(blowout - narrow < 0.7);
  });
});

describe('accesoIndex', () => {
  it('drops Bullaude below Vega and Cota on J3 freeze', () => {
    const bullaude = accesoIndex(8.01, teamPerformanceScore(-3, 0.56));
    const cota = accesoIndex(8.38, teamPerformanceScore(3, 0.44));
    const vega = accesoIndex(8.26, teamPerformanceScore(2, 0.48));
    const juninho = accesoIndex(9.18, teamPerformanceScore(4, 0.42));

    assert.ok(bullaude < 7.1, `Bullaude A=${bullaude}`);
    assert.ok(cota > 8.1, `Cota A=${cota}`);
    assert.ok(vega > 8.0, `Vega A=${vega}`);
    assert.ok(juninho > vega && juninho > cota);
    assert.ok(bullaude < vega && bullaude < cota);
  });
});

describe('opponent shrink', () => {
  it('pulls early-tabla Opp toward 0.5', () => {
    assert.equal(shrinkOpp(0.7, 3), 0.7 * 0.5 + 0.3 * 0.7);
    assert.equal(shrinkOpp(0.7, 4), 0.7);
  });

  it('maps PPG to [0.30, 0.70]', () => {
    const opp = ppgToOpp(2.4, 1.0, 0.5);
    assert.ok(opp <= 0.7);
    assert.ok(opp >= 0.3);
  });
});

describe('pickAccesoXi J3 freeze', () => {
  it('does not pick Bullaude as the 9', () => {
    const fillers = (band: AccesoPoolPlayer['position'], n: number, start = 0): AccesoPoolPlayer[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `${band}-${start + i}`,
        teamAbbr: `T${(start + i) % 12}`,
        position: band,
        acceso: 7.4 - i * 0.02,
      }));

    const pool: AccesoPoolPlayer[] = [
      { id: 'juninho', teamAbbr: 'UNAM', position: 'FWD', acceso: 8.77 },
      { id: 'vega', teamAbbr: 'TOL', position: 'FWD', acceso: 8.17 },
      { id: 'morales', teamAbbr: 'UNAM', position: 'FWD', acceso: 8.2 },
      { id: 'bullaude', teamAbbr: 'SAN', position: 'FWD', acceso: 6.92 },
      { id: 'cota', teamAbbr: 'AME', position: 'GK', acceso: 8.25 },
      { id: 'jimenez', teamAbbr: 'ATL', position: 'GK', acceso: 8.1 },
      ...fillers('DEF', 8),
      ...fillers('MID', 8, 20),
      ...fillers('FWD', 4, 40),
    ];

    const xi = pickAccesoXi(pool);
    assert.ok(xi);
    assert.equal(xi!.players.length, 11);
    const st = xi!.players.find((p) => p.slot === 9 || p.slot === 11);
    const ids = xi!.players.map((p) => p.id);
    assert.ok(!ids.includes('bullaude'), `XI=${ids.join(',')}`);
    assert.ok(ids.includes('vega') || ids.includes('juninho') || ids.includes('morales'));
    void st;
  });

  it('maps 4-4-2 as four mids, 4-2-3-1 as five mids', () => {
    const counts = (f: string) =>
      bandsForFormation(f).reduce<Record<string, number>>((acc, b) => {
        acc[b] = (acc[b] ?? 0) + 1;
        return acc;
      }, {});
    assert.deepEqual(counts('4-4-2'), { GK: 1, DEF: 4, MID: 4, FWD: 2 });
    assert.deepEqual(counts('4-2-3-1'), { GK: 1, DEF: 4, MID: 5, FWD: 1 });
    assert.deepEqual(counts('4-3-3'), { GK: 1, DEF: 4, MID: 3, FWD: 3 });
    assert.deepEqual(counts('3-5-2'), { GK: 1, DEF: 3, MID: 5, FWD: 2 });
  });
});
