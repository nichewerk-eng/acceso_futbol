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
  it('explains an away clean sheet in fan language', () => {
    const text = fallbackTeamPickedWhy(club({}));
    assert.match(text, /Atlas es el equipo de la jornada/);
    assert.match(text, /ganó 2-0 de visita a Cruz Azul y no le metieron/);
    assert.doesNotMatch(text, /Acceso/);
    assert.doesNotMatch(text, /portería en cero/);
    assert.equal(teamWhyLooksWrong(text, club({})), false);
    assert.equal(text.split(/(?<=[.!?])\s+/).filter(Boolean).length, 2);
  });

  it('calls a 5-2 a goleada and names the 2-0s it beat', () => {
    const row = club({
      abbr: 'GDL',
      name: 'Guadalajara',
      gf: 5,
      ga: 2,
      home: true,
      opponentAbbr: 'TIJ',
      opponentName: 'Tijuana',
      pos: 4,
      opponentPos: 6,
    });
    const text = fallbackTeamPickedWhy(row, [
      club({ abbr: 'LEO', name: 'León', gf: 2, ga: 0, home: true }),
      club({ abbr: 'ATS', name: 'Atlas', gf: 2, ga: 0 }),
    ]);
    assert.match(text, /goleó 5-2 en casa a Tijuana/);
    assert.match(text, /5 goles es lo más ruidoso de la fecha/);
    assert.match(text, /León y Atlas ganaron 2-0 y eso no alcanza/);
    assert.doesNotMatch(text, /modelo|retornos|Acceso|portería/);
    assert.equal(teamWhyLooksWrong(text, row), false);
  });
});

describe('teamWhyLooksWrong', () => {
  it('rejects the 12-to-2 climb hallucination', () => {
    const bad =
      'Atlas es el equipo de la jornada por su victoria 2, 0 en visita ante Cruz Azul, escalando del 12° al 2° lugar. Ganó sin recibir goles frente a un rival directo, demostrando solidez defensiva en condición de visitante.';
    assert.equal(teamWhyLooksWrong(bad, club({})), true);
  });

  it('rejects copy that talks about the model', () => {
    const bad =
      'Guadalajara es el equipo de la jornada Acceso porque convirtió cinco goles sin necesidad de portería en cero, demostrando capacidad ofensiva superior a rivales mejor posicionados. Su marcador 5-2 contra Tijuana genera retornos más altos que victorias defensivas 2-0, validando el modelo de puntuación Acceso que premia gol sobre cero.';
    const gdl = club({
      abbr: 'GDL',
      name: 'Guadalajara',
      pos: 4,
      opponentPos: 6,
    });
    assert.equal(teamWhyLooksWrong(bad, gdl), true);
  });
});
