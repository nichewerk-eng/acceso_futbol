import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pickFotmobPlayer,
  searchTermsForPlayer,
  usablePlayerPhoto,
  type FotmobSuggestHit,
} from './playerFaces';

const J6_GAPS: FotmobSuggestHit[] = [
  { id: '772312', name: 'Daniel Parra', teamName: 'Querétaro FC' },
  { id: '889869', name: 'Óscar Macías', teamName: 'Atlético de San Luis' },
  { id: '1367053', name: 'Oswaldo Virgen', teamName: 'Toluca' },
  { id: '2090280', name: 'Alejandro Cárdenas', teamName: 'CF América' },
  { id: '1353113', name: 'Everardo López', teamName: 'Toluca' },
  { id: '1083228', name: 'Everardo Rubio', teamName: 'Club Sport Herediano' },
];

describe('usablePlayerPhoto', () => {
  it('drops Sportmonks placeholders', () => {
    assert.equal(
      usablePlayerPhoto('https://cdn.sportmonks.com/images/soccer/placeholder.png'),
      undefined
    );
  });

  it('keeps a real headshot', () => {
    assert.equal(
      usablePlayerPhoto('https://cdn.sportmonks.com/images/soccer/players/18/20673426.png'),
      'https://cdn.sportmonks.com/images/soccer/players/18/20673426.png'
    );
  });
});

describe('searchTermsForPlayer', () => {
  it('adds a particle-stripped form and the first name', () => {
    const terms = searchTermsForPlayer('Everardo del Villar');
    assert.deepEqual(terms, ['Everardo del Villar', 'Everardo Villar', 'Everardo']);
  });
});

describe('pickFotmobPlayer', () => {
  it('matches J6 faces that Sportmonks leaves blank', () => {
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Daniel Parra', 'QRO')?.id, '772312');
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Óscar Macías', 'ASL')?.id, '889869');
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Oswaldo Virgen', 'TOL')?.id, '1367053');
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Alejandro Cárdenas', 'AME')?.id, '2090280');
  });

  it('uses first name + club when FotMob has a different surname', () => {
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Everardo del Villar', 'TOL')?.id, '1353113');
  });

  it('does not pick a namesake at another club', () => {
    assert.equal(pickFotmobPlayer(J6_GAPS, 'Everardo del Villar', 'AME'), null);
  });
});
