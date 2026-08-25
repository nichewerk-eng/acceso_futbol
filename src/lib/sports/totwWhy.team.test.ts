import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fallbackTeamPickedWhy, teamWhyLooksWrong } from './totwWhy';
import type { TotwClub } from './totw';

function club(partial: Partial<TotwClub>): TotwClub {
  return {
    abbr: 'ATS',
    name: 'Atlas',
    score: 8.62,
    result: 'W',
    gf: 2,
    ga: 0,
    home: false,
    opponentAbbr: 'CAZ',
    opponentName: 'Cruz Azul',
    pos: 2,
    opponentPos: 12,
    rank: 1,
    why: 'Ganó 2-0 visita vs CAZ · 2° vs 12°',
    ...partial,
  };
}

describe('fallbackTeamPickedWhy', () => {
  it('explains an away clean sheet without inventing a tabla climb', () => {
    const text = fallbackTeamPickedWhy(club({}));
    assert.match(text, /Atlas es el equipo de la jornada/);
    assert.match(text, /ganó 2-0 de visita contra Cruz Azul/);
    assert.match(text, /portería en cero/);
    assert.match(text, /Atlas es 2° y Cruz Azul es 12°/);
    assert.equal(teamWhyLooksWrong(text, club({})), false);
    assert.equal(text.split(/(?<=[.!?])\s+/).filter(Boolean).length, 2);
  });

  it('still names both tabla places when the winner is the underdog', () => {
    const row = club({
      pos: 15,
      opponentPos: 2,
      opponentName: 'Guadalajara',
      opponentAbbr: 'GDL',
    });
    const text = fallbackTeamPickedWhy(row);
    assert.match(text, /Atlas es 15° y Guadalajara es 2°/);
    assert.equal(teamWhyLooksWrong(text, row), false);
  });
});

describe('teamWhyLooksWrong', () => {
  it('rejects the 12-to-2 climb hallucination', () => {
    const bad =
      'Atlas es el equipo de la jornada por su victoria 2, 0 en visita ante Cruz Azul, escalando del 12° al 2° lugar. Ganó sin recibir goles frente a un rival directo, demostrando solidez defensiva en condición de visitante.';
    assert.equal(teamWhyLooksWrong(bad, club({})), true);
  });
});
