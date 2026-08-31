import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Fixture } from '@/lib/sports/types';
import { mintFromFixture, pickLeadMint, selloAlerts, selloSnap } from './mint';

function fx(partial: Partial<Fixture> & Pick<Fixture, 'id' | 'state'>): Fixture {
  const { home, away, ...rest } = partial;
  return {
    provider: 'sportmonks',
    league: 'liga-mx',
    date: '2026-08-31T02:10:00Z',
    jornada: 'Jornada 7',
    statusLabel: rest.state === 'in' ? 'En vivo' : rest.state === 'post' ? 'Final' : 'Por jugar',
    ...rest,
    home: {
      id: 'ame',
      name: 'América',
      abbreviation: 'AME',
      score: '0',
      ...home,
    },
    away: {
      id: 'gdl',
      name: 'Guadalajara',
      abbreviation: 'GDL',
      score: '0',
      ...away,
    },
  };
}

describe('mintFromFixture', () => {
  it('mints a gravity gol with Acceso voice', () => {
    const mint = mintFromFixture(
      fx({
        id: '1',
        state: 'in',
        clock: '64\'',
        home: { id: 'ame', name: 'América', abbreviation: 'AME', score: '1' },
        away: { id: 'pue', name: 'Puebla', abbreviation: 'PUE', score: '0' },
        scorers: [{ name: 'Martín', minute: '64', side: 'home' }],
      }),
      { clubId: 'america' }
    );
    assert.equal(mint.kind, 'gol');
    assert.equal(mint.stamp, 'GOL');
    assert.equal(mint.gravitySide, 'home');
    assert.match(mint.headline, /Águilas|marca/i);
    assert.match(mint.line, /Martín/);
    assert.equal(mint.href, '/sello/liga-mx/1');
    assert.equal(mint.palette.signal, '#f0c419');
  });

  it('hurts when gravity concedes', () => {
    const mint = mintFromFixture(
      fx({
        id: '2',
        state: 'in',
        home: { id: 'ame', name: 'América', abbreviation: 'AME', score: '0' },
        away: { id: 'pue', name: 'Puebla', abbreviation: 'PUE', score: '1' },
        scorers: [{ name: 'Angulo', minute: '12', side: 'away' }],
      }),
      { clubId: 'america' }
    );
    assert.equal(mint.kind, 'gol');
    assert.match(mint.headline, /Duele/);
    assert.equal(mint.gravitySide, 'home');
  });

  it('seals a goleada final without gravity', () => {
    const mint = mintFromFixture(
      fx({
        id: '3',
        state: 'post',
        winnerSide: 'home',
        home: { id: 'ame', name: 'América', abbreviation: 'AME', score: '4' },
        away: { id: 'pue', name: 'Puebla', abbreviation: 'PUE', score: '0' },
        scorers: [{ name: 'Zendejas', minute: '9', side: 'home' }],
      })
    );
    assert.equal(mint.kind, 'final');
    assert.equal(mint.stamp, 'FT');
    assert.match(mint.headline, /no pidió permiso/i);
    assert.equal(mint.palette.ink, '#1e223d');
  });

  it('keeps 0-0 live as live, not gol', () => {
    const mint = mintFromFixture(fx({ id: '4', state: 'in', clock: 'HT' }));
    assert.equal(mint.kind, 'live');
    assert.equal(mint.stamp, 'HT');
    assert.match(mint.headline, /0-0|blanco/i);
  });

  it('pre card uses VS stamp', () => {
    const mint = mintFromFixture(
      fx({
        id: '5',
        state: 'pre',
        home: { id: 'pue', name: 'Puebla', abbreviation: 'PUE' },
        away: { id: 'gdl', name: 'Guadalajara', abbreviation: 'GDL' },
      }),
      { clubId: 'chivas' }
    );
    assert.equal(mint.kind, 'pre');
    assert.equal(mint.stamp, 'VS');
    assert.equal(mint.gravitySide, 'away');
    assert.match(mint.headline, /Rebaño/i);
  });
});

describe('pickLeadMint', () => {
  it('prefers the gravity live match over a louder other game', () => {
    const loud = fx({
      id: 'loud',
      state: 'in',
      home: { id: 'mty', name: 'Monterrey', abbreviation: 'MTY', score: '3' },
      away: { id: 'asl', name: 'Atlético San Luis', abbreviation: 'ASL', score: '1' },
    });
    const mine = fx({
      id: 'mine',
      state: 'in',
      home: { id: 'ame', name: 'América', abbreviation: 'AME', score: '1' },
      away: { id: 'gdl', name: 'Guadalajara', abbreviation: 'GDL', score: '1' },
    });
    const lead = pickLeadMint([loud, mine], { clubId: 'america' });
    assert.equal(lead?.fixtureId, 'mine');
  });
});

describe('selloAlerts', () => {
  it('fires gol when the score ticks while live', () => {
    const kinds = selloAlerts(
      { state: 'in', hs: 0, as: 0 },
      { state: 'in', hs: 1, as: 0 }
    );
    assert.deepEqual(kinds, ['goal']);
  });

  it('fires final on the whistle without a last-second goal', () => {
    const kinds = selloAlerts(
      { state: 'in', hs: 2, as: 1 },
      { state: 'post', hs: 2, as: 1 }
    );
    assert.deepEqual(kinds, ['final']);
  });

  it('does not overlay a catch-up FT', () => {
    const kinds = selloAlerts(
      { state: 'pre', hs: 0, as: 0 },
      { state: 'post', hs: 3, as: 0 }
    );
    assert.deepEqual(kinds, []);
  });

  it('prefers gol when the winner lands on the FT tick', () => {
    const kinds = selloAlerts(
      { state: 'in', hs: 1, as: 1 },
      { state: 'post', hs: 2, as: 1 }
    );
    assert.deepEqual(kinds, ['goal']);
  });
});

describe('selloSnap', () => {
  it('reads numeric scores', () => {
    const snap = selloSnap(
      fx({
        id: 'n',
        state: 'in',
        home: { id: 'ame', name: 'América', abbreviation: 'AME', score: '2' },
        away: { id: 'gdl', name: 'Guadalajara', abbreviation: 'GDL', score: '1' },
      })
    );
    assert.equal(snap.hs, 2);
    assert.equal(snap.as, 1);
  });
});
