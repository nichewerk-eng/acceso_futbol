import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fallbackPlayerWhy,
  fallbackTeamPickedWhy,
  playerWhyLooksWrong,
  teamWhyLooksWrong,
  type PlayerDossier,
} from './totwWhy';
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

  it('does not sell a 3-1 away as a 6th-vs-4th climb', () => {
    const row = club({
      abbr: 'QRO',
      name: 'Querétaro',
      score: 9.05,
      gf: 3,
      ga: 1,
      home: false,
      opponentAbbr: 'ATS',
      opponentName: 'Atlas',
      pos: 6,
      opponentPos: 4,
    });
    const text = fallbackTeamPickedWhy(row, [
      club({
        abbr: 'ASL',
        name: 'Atlético de San Luis',
        gf: 3,
        ga: 1,
        home: false,
        opponentAbbr: 'MTY',
        opponentName: 'Monterrey',
      }),
      club({
        abbr: 'TOL',
        name: 'Toluca',
        gf: 4,
        ga: 0,
        home: true,
        opponentAbbr: 'JUA',
        opponentName: 'Juárez',
      }),
    ]);
    assert.match(text, /Querétaro es el equipo de la jornada: ganó 3-1 de visita a Atlas/);
    assert.match(text, /3 de visita pesan más que el 4-0 de Toluca/);
    assert.doesNotMatch(text, /desde el|ante el|6°|4°/);
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

  it('rejects 6th-vs-4th table talk', () => {
    const qro = club({
      abbr: 'QRO',
      name: 'Querétaro',
      gf: 3,
      ga: 1,
      pos: 6,
      opponentPos: 4,
    });
    const bad =
      'Querétaro es el equipo de la jornada: ganó 3-1 de visita a Atlas. Lo hizo desde el 6° ante el 4°.';
    assert.equal(teamWhyLooksWrong(bad, qro), true);
  });
});

function keeper(partial: Partial<PlayerDossier> = {}): PlayerDossier {
  return {
    id: 'sanchez',
    name: 'Andrés Sánchez',
    rating: 8.22,
    smRating: 8.3,
    teamScore: 8.0,
    accesoIndex: 8.22,
    rank: 4,
    position: 'portero',
    jornada: 6,
    fixtureId: 'mty-asl',
    team: 'San Luis',
    opponent: 'Monterrey',
    home: false,
    score: 'MTY 1-3 ASL',
    gf: 3,
    ga: 1,
    result: 'W',
    cleanSheet: false,
    goals: [],
    assists: [],
    cards: [],
    notes: [],
    ...partial,
  };
}

describe('playerWhyLooksWrong', () => {
  it('rejects a clean sheet claim on a 3-1', () => {
    const text =
      'Andrés Sánchez mantuvo la portería en cero en la victoria 3-1 de San Luis visitando a Monterrey.';
    assert.equal(playerWhyLooksWrong(text, keeper()), true);
  });

  it('rejects clean-sheet language even without ga when the score has both sides scoring', () => {
    const text =
      'Andrés Sánchez mantuvo la portería en cero en la victoria 3-1 de San Luis visitando a Monterrey.';
    assert.equal(playerWhyLooksWrong(text, keeper({ ga: null, gf: null })), true);
  });

  it('allows a real clean sheet', () => {
    const d = keeper({ gf: 3, ga: 0, cleanSheet: true, score: 'MTY 0-3 ASL' });
    const text =
      'Andrés Sánchez no le metieron en la victoria 3-0 de San Luis visitando a Monterrey.';
    assert.equal(playerWhyLooksWrong(text, d), false);
  });

  it('rejects invented save counts', () => {
    assert.equal(
      playerWhyLooksWrong('Atajó 7 paradas en la victoria 3-1 de San Luis.', keeper()),
      true
    );
  });
});

describe('fallbackPlayerWhy', () => {
  it('does not call a 3-1 a clean sheet', () => {
    const text = fallbackPlayerWhy(keeper());
    assert.match(text, /Encajó un gol/);
    assert.match(text, /victoria 3-1 de San Luis visitando a Monterrey/);
    assert.doesNotMatch(text, /portería en cero|no le metieron|valla/);
    assert.equal(playerWhyLooksWrong(text, keeper()), false);
  });

  it('says they kept a clean sheet only when ga is 0', () => {
    const d = keeper({ gf: 2, ga: 0, cleanSheet: true, score: 'MTY 0-2 ASL' });
    const text = fallbackPlayerWhy(d);
    assert.match(text, /No le metieron/);
    assert.match(text, /2-0/);
    assert.equal(playerWhyLooksWrong(text, d), false);
  });
});
