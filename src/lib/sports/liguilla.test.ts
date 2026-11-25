import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { attachDondeVer, setDondeVerOverlay } from '@/config/dondeVer';
import { buildSnapshot } from '@/lib/dondeVer/sheet';
import {
  buildLiguillaBoard,
  liguillaFixtureTag,
  resolveLiguillaPlaceholders,
  roundLabel,
  roundNumberFromLabel,
  roundShort,
} from './liguilla';
import { mapFixture } from './sportmonks';
import type { Fixture, MatchState } from './types';

function leg(
  id: string,
  jornada: string,
  legN: 1 | 2,
  date: string,
  home: string,
  away: string,
  state: MatchState = 'pre',
  score: [number, number] | null = null
): Fixture {
  return {
    id,
    provider: 'sportmonks',
    league: 'liga-mx',
    date,
    jornada,
    leg: legN,
    state,
    statusLabel: state === 'post' ? 'Final' : 'Próximo',
    home: { id: home, name: home, abbreviation: home, score: score ? String(score[0]) : null },
    away: { id: away, name: away, abbreviation: away, score: score ? String(score[1]) : null },
  };
}

function placeholder(id: string, jornada: string, legN: 1 | 2, date: string, h: number, a: number): Fixture {
  const f = leg(id, jornada, legN, date, 'TBD', 'TBD');
  return {
    ...f,
    home: { ...f.home, placeholder: true, placeholderRank: h },
    away: { ...f.away, placeholder: true, placeholderRank: a },
  };
}

const QF = 'Cuartos de final';
const SF = 'Semifinales';

const cuartosPre = [
  leg('1', QF, 1, '2026-11-26T01:00:00Z', 'TOL', 'ATS'),
  leg('2', QF, 1, '2026-11-26T03:10:00Z', 'MTY', 'AME'),
  leg('3', QF, 1, '2026-11-27T01:00:00Z', 'PAC', 'GDL'),
  leg('4', QF, 1, '2026-11-27T03:10:00Z', 'LEO', 'CAZ'),
  leg('5', QF, 2, '2026-11-29T01:00:00Z', 'ATS', 'TOL'),
  leg('6', QF, 2, '2026-11-29T03:10:00Z', 'AME', 'MTY'),
  leg('7', QF, 2, '2026-11-30T01:07:00Z', 'GDL', 'PAC'),
  leg('8', QF, 2, '2026-11-30T03:00:00Z', 'CAZ', 'LEO'),
];

const semisPlaceholders = [
  placeholder('9', SF, 1, '2026-12-02T00:00:00Z', 3, 2),
  placeholder('10', SF, 1, '2026-12-02T00:00:00Z', 4, 1),
  placeholder('11', SF, 2, '2026-12-05T00:00:00Z', 2, 3),
  placeholder('12', SF, 2, '2026-12-05T00:00:00Z', 1, 4),
];

function played(list: Fixture[], scores: Record<string, [number, number]>): Fixture[] {
  return list.map((f) =>
    scores[f.id]
      ? {
          ...f,
          state: 'post' as const,
          statusLabel: 'Final',
          home: { ...f.home, score: String(scores[f.id]![0]) },
          away: { ...f.away, score: String(scores[f.id]![1]) },
        }
      : f
  );
}

describe('liguilla rounds', () => {
  it('numbers and labels continue the jornada scale', () => {
    assert.equal(roundNumberFromLabel('Jornada 17'), 17);
    assert.equal(roundNumberFromLabel('Cuartos de final'), 18);
    assert.equal(roundNumberFromLabel('Semifinales'), 19);
    assert.equal(roundNumberFromLabel('Final'), 20);
    assert.equal(roundLabel(18), 'Cuartos de final');
    assert.equal(roundLabel(9), 'Jornada 9');
    assert.equal(roundShort(19), 'Semis');
    assert.equal(liguillaFixtureTag({ jornada: QF, leg: 2 }), 'Cuartos · Vuelta');
    assert.equal(liguillaFixtureTag({ jornada: 'Jornada 3' }), null);
  });
});

describe('liguilla board', () => {
  const now = new Date('2026-11-25T18:00:00Z');

  it('seeds cuartos 1v8 · 2v7 · 3v6 · 4v5 with the higher seed hosting the vuelta', () => {
    const board = buildLiguillaBoard([...cuartosPre, ...semisPlaceholders], now);
    const qf = board.rounds[0]!;
    assert.deepEqual(
      qf.series.map((s) => `${s.high.abbr}-${s.low.abbr}`),
      ['GDL-PAC', 'CAZ-LEO', 'AME-MTY', 'ATS-TOL']
    );
    assert.equal(qf.series[0]!.ida?.id, '3');
    assert.equal(qf.series[0]!.vuelta?.id, '7');
    assert.equal(qf.series[0]!.status, 'pre');
    assert.match(qf.series[3]!.verdict, /avanza ATS por posición/);
    assert.equal(board.current, 'cuartos');
    assert.equal(board.rounds[1]!.series[0]!.status, 'tbd');
    assert.equal(board.rounds[1]!.series[0]!.high.name, 'Mejor sembrado');
    assert.deepEqual(
      board.today.map((f) => f.id),
      ['1', '2']
    );
  });

  it('a tied global sends the better seed through', () => {
    const fixtures = played(cuartosPre, { '1': [2, 1], '5': [1, 0] });
    const board = buildLiguillaBoard(fixtures, now);
    const s = board.rounds[0]!.series[3]!;
    assert.deepEqual(s.aggregate, { high: 2, low: 2 });
    assert.equal(s.winner, 'high');
    assert.equal(s.decidedBy, 'posicion');
    assert.match(s.verdict, /ATS a semifinales/);
  });

  it('tracks the series leader between legs', () => {
    const board = buildLiguillaBoard(played(cuartosPre, { '2': [2, 0] }), now);
    const s = board.rounds[0]!.series[2]!;
    assert.equal(s.status, 'between');
    assert.equal(s.leader, 'low');
    assert.match(s.verdict, /Global AME 0–2 MTY · MTY lleva ventaja/);
  });

  it('reseeds survivors into semis and fills Sportmonks placeholders', () => {
    // GDL, LEO (7), MTY (6), ATS (4) survive → 1 GDL, 2 ATS, 3 MTY, 4 LEO.
    const fixtures = played(cuartosPre, {
      '1': [1, 1],
      '5': [1, 1],
      '2': [2, 0],
      '6': [1, 1],
      '3': [0, 1],
      '7': [2, 0],
      '4': [3, 0],
      '8': [1, 1],
    });
    const all = resolveLiguillaPlaceholders([...fixtures, ...semisPlaceholders]);
    const sfIda = all.find((f) => f.id === '9')!;
    assert.equal(sfIda.home.abbreviation, 'MTY');
    assert.equal(sfIda.away.abbreviation, 'ATS');
    const board = buildLiguillaBoard(all, new Date('2026-11-30T12:00:00Z'));
    assert.equal(board.current, 'semis');
    assert.deepEqual(
      board.rounds[1]!.series.map((s) => `${s.high.abbr}-${s.low.abbr}`),
      ['GDL-LEO', 'ATS-MTY']
    );
    assert.equal(board.rounds[1]!.series[0]!.ida?.id, '10');
    assert.equal(board.nextDayKey, '2026-12-01');
  });

  it('decides a tied final on penalties and crowns a champion', () => {
    // Seeds 1–4 survive cuartos → semis GDL–ATS, CAZ–AME.
    const qf = played(cuartosPre, {
      '1': [0, 1], '5': [1, 0], '2': [0, 0], '6': [1, 0],
      '3': [0, 0], '7': [1, 0], '4': [0, 0], '8': [1, 0],
    });
    const sf = [
      leg('s1', SF, 1, '2026-12-02T02:00:00Z', 'ATS', 'GDL', 'post', [2, 0]),
      leg('s2', SF, 2, '2026-12-05T02:00:00Z', 'GDL', 'ATS', 'post', [1, 0]),
      leg('s3', SF, 1, '2026-12-03T02:00:00Z', 'AME', 'CAZ', 'post', [0, 0]),
      leg('s4', SF, 2, '2026-12-06T02:00:00Z', 'CAZ', 'AME', 'post', [1, 1]),
    ];
    const fin: Fixture[] = [
      leg('f1', 'Final', 1, '2026-12-11T02:00:00Z', 'ATS', 'CAZ', 'post', [1, 1]),
      {
        ...leg('f2', 'Final', 2, '2026-12-14T02:00:00Z', 'CAZ', 'ATS', 'post', [0, 0]),
        penalties: { home: 3, away: 4 },
      },
    ];
    const board = buildLiguillaBoard([...qf, ...sf, ...fin], new Date('2026-12-15T00:00:00Z'));
    assert.equal(board.rounds[1]!.series[1]!.decidedBy, 'posicion');
    const final = board.rounds[2]!.series[0]!;
    assert.equal(final.high.abbr, 'CAZ');
    assert.equal(final.low.abbr, 'ATS');
    assert.equal(final.decidedBy, 'penales');
    assert.equal(board.champion?.abbr, 'ATS');
  });
});

describe('sportmonks liguilla mapping', () => {
  it('maps stage, leg and placeholder sides', () => {
    const f = mapFixture({
      id: 19902653,
      starting_at: '2026-12-02 00:00:00',
      league_id: 743,
      leg: '1/2',
      stage: { name: 'Apertura - Semi-finals' },
      state: { id: 1, short_name: 'NS', developer_name: 'NS' },
      participants: [
        { id: 266889, name: '2nd ranked', placeholder: true, meta: { location: 'away' } },
        { id: 266864, name: '3rd ranked', placeholder: true, meta: { location: 'home' } },
      ],
    } as Parameters<typeof mapFixture>[0]);
    assert.equal(f.jornada, 'Semifinales');
    assert.equal(f.leg, 1);
    assert.equal(f.home.placeholder, true);
    assert.equal(f.home.placeholderRank, 3);
    assert.equal(f.away.name, '2º mejor sembrado');
  });

  it('falls back to the stage id when the stage include is missing', () => {
    const f = mapFixture({
      id: 19905944,
      starting_at: '2026-11-26 01:00:00',
      league_id: 743,
      leg: '1/2',
      stage_id: 77485004,
      participants: [
        { id: 1, name: 'Toluca', short_code: 'TOL', meta: { location: 'home' } },
        { id: 2, name: 'Atlas', short_code: 'ATS', meta: { location: 'away' } },
      ],
    } as Parameters<typeof mapFixture>[0]);
    assert.equal(f.jornada, 'Cuartos de final');
    assert.equal(f.home.abbreviation, 'TOL');
  });
});

describe('liguilla dónde ver', () => {
  const tolAts = leg('1', QF, 1, '2026-11-26T01:00:00Z', 'TOL', 'ATS');

  it('without a sheet row, falls back to the host club defaults', () => {
    setDondeVerOverlay(null);
    const ida = attachDondeVer(tolAts);
    assert.deepEqual(ida.dondeVer?.mxChannels, ['vix']);
    assert.deepEqual(ida.dondeVer?.usChannels, ['tudn']);
    const vuelta = attachDondeVer(leg('7', QF, 2, '2026-11-30T01:07:00Z', 'GDL', 'PAC'));
    assert.deepEqual(vuelta.dondeVer?.mxChannels, ['prime-video']);
  });

  it('a sheet row with blank Jornada is filed by its Fecha, not the regular-season pair', () => {
    const snap = buildSnapshot(
      'Jornada,Fecha,Local,Visita,MX 1,MX 2,US 1\n,2026-11-25,TOL,ATS,ViX,Canal 5,TUDN\n',
      ''
    );
    assert.deepEqual(Object.keys(snap.matches).sort(), ['2026-11-25|ATS|TOL', 'cuartos|TOL|ATS']);
    setDondeVerOverlay(snap);
    assert.deepEqual(attachDondeVer(tolAts).dondeVer?.mxChannels, ['vix', 'canal-5']);
    setDondeVerOverlay(null);
  });

  it('a sheet Liguilla row wins and never borrows the regular-season pair', () => {
    const snap = buildSnapshot(
      'Jornada,Local,Visita,MX,US\nCuartos,TOL,ATS,ViX,Univision\n',
      ''
    );
    setDondeVerOverlay(snap);
    const f = attachDondeVer(tolAts);
    assert.deepEqual(f.dondeVer?.mxChannels, ['vix']);
    assert.deepEqual(f.dondeVer?.usChannels, ['univision']);
    const vuelta = attachDondeVer(leg('5', QF, 2, '2026-11-29T01:00:00Z', 'ATS', 'TOL'));
    assert.deepEqual(vuelta.dondeVer?.mxChannels, ['canal-5', 'tudn', 'vix', 'layvtime']);
    setDondeVerOverlay(null);
  });

  it('placeholder slots stay unconfirmed', () => {
    const f = attachDondeVer(placeholder('9', SF, 1, '2026-12-02T00:00:00Z', 3, 2));
    assert.equal(f.dondeVer?.confirmed, false);
  });
});
