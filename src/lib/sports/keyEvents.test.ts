import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyVarNarrative } from './keyEvents';
import type { MatchSnapshot } from './types';

const team = (name: string, abbreviation: string) => ({
  id: abbreviation,
  name,
  abbreviation,
});

function match(partial: Partial<MatchSnapshot>): MatchSnapshot {
  return {
    id: '19715263',
    provider: 'sportmonks',
    league: 'liga-mx',
    date: '2026-08-30T19:00:00-06:00',
    state: 'in',
    statusLabel: '1st-half',
    home: team('Toluca', 'TOL'),
    away: team('Juárez', 'JUA'),
    events: [],
    comments: [],
    ...partial,
  } as MatchSnapshot;
}

describe('applyVarNarrative', () => {
  it('rewrites a mute VAR event into Gol anulado', () => {
    const next = applyVarNarrative(
      match({
        events: [
          {
            id: '1',
            period: 1,
            clock: "10'",
            minute: 10,
            type: 'Gol',
            kind: 'goal',
            text: 'Helinho · asistencia Everardo Villar',
            teamAbbr: 'TOL',
            playerName: 'Helinho',
            relatedPlayerName: 'Everardo Villar',
          },
          {
            id: '2',
            period: 1,
            clock: "18'",
            minute: 18,
            type: 'VAR',
            kind: 'var',
            text: 'Oswaldo Virgen',
            teamAbbr: 'TOL',
            playerName: 'Oswaldo Virgen',
          },
        ],
        comments: [
          {
            id: 'c1',
            minute: 10,
            clock: "10'",
            text: '¡Gooooool! Toluca 1, Juárez 0. Helinho (Toluca) remate con la izquierda.',
            isGoal: true,
          },
          {
            id: 'c2',
            minute: 17,
            clock: "17'",
            text: 'GOL ANULADO POR EL VAR: Oswaldo Virgen (Toluca) ha marcado pero tras la revisión del VAR el gol no sube al marcador.',
          },
          {
            id: 'c3',
            minute: 18,
            clock: "18'",
            text: 'Decisión del VAR: No Fue Gol Toluca 1-0 Juárez.',
          },
        ],
        scorers: [{ name: 'Helinho', minute: '10', side: 'home' }],
      })
    );

    const varRows = next.events.filter((e) => e.kind === 'var' || e.type === 'Anulado');
    assert.equal(varRows.length, 1);
    assert.equal(varRows[0]?.type, 'Anulado');
    assert.equal(varRows[0]?.text, 'Gol anulado · Oswaldo Virgen');
    assert.equal(
      next.events.some((e) => e.kind === 'goal' && e.playerName === 'Helinho'),
      true
    );
    assert.equal(
      next.events.some((e) => e.kind === 'goal' && /virgen/i.test(e.playerName ?? '')),
      false
    );
    assert.equal(next.scorers?.map((s) => s.name).join(), 'Helinho');
  });

  it('drops a SM goal that ESPN says the VAR took off', () => {
    const next = applyVarNarrative(
      match({
        events: [
          {
            id: 'g',
            period: 1,
            clock: "17'",
            minute: 17,
            type: 'Gol',
            kind: 'goal',
            text: 'Oswaldo Virgen',
            teamAbbr: 'TOL',
            playerName: 'Oswaldo Virgen',
          },
        ],
        comments: [
          {
            id: 'c',
            minute: 17,
            clock: "17'",
            text: 'GOL ANULADO POR EL VAR: Oswaldo Virgen (Toluca) ha marcado pero tras la revisión del VAR el gol no sube al marcador.',
          },
        ],
        scorers: [{ name: 'Oswaldo Virgen', minute: '17', side: 'home' }],
      })
    );

    assert.equal(next.events.some((e) => e.kind === 'goal'), false);
    assert.equal(next.events.some((e) => e.type === 'Anulado'), true);
    assert.equal(next.scorers?.length, 0);
  });

  it('is idempotent', () => {
    const first = applyVarNarrative(
      match({
        events: [
          {
            id: '2',
            period: 1,
            clock: "18'",
            minute: 18,
            type: 'VAR',
            kind: 'var',
            text: 'Oswaldo Virgen',
            teamAbbr: 'TOL',
            playerName: 'Oswaldo Virgen',
          },
        ],
        comments: [
          {
            id: 'c2',
            minute: 17,
            clock: "17'",
            text: 'GOL ANULADO POR EL VAR: Oswaldo Virgen (Toluca) ha marcado pero tras la revisión del VAR el gol no sube al marcador.',
          },
        ],
      })
    );
    const second = applyVarNarrative(first);
    assert.equal(second.events.filter((e) => e.type === 'Anulado').length, 1);
    assert.equal(second.events[0]?.text, first.events[0]?.text);
  });
});
