import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isFixtureHeld, isFixturePostponed, kickHold, kickHoldLabel, localizeStatus } from './localizeEs';

describe('kickHold', () => {
  it('reads delayed / retrasado as atrasado', () => {
    assert.equal(kickHold('Delayed'), 'delayed');
    assert.equal(kickHold('Retrasado'), 'delayed');
    assert.equal(kickHoldLabel(kickHold('Retrasado')), 'Atrasado');
    assert.equal(localizeStatus('Delayed', 'pre'), 'Atrasado');
    assert.equal(localizeStatus('Retrasado', 'pre'), 'Atrasado');
  });

  it('keeps a normal kickoff as próximo, not held', () => {
    assert.equal(kickHold('Próximo'), null);
    assert.equal(kickHold('Not Started'), null);
    assert.equal(localizeStatus('Not Started', 'pre'), 'Próximo');
  });

  it('maps postponed and cancelled', () => {
    assert.equal(kickHoldLabel(kickHold('Postponed')), 'Aplazado');
    assert.equal(kickHoldLabel(kickHold('Cancelled')), 'Cancelado');
  });
});

describe('isFixtureHeld', () => {
  it('treats postponed and cancelled as held, not delayed', () => {
    assert.equal(isFixtureHeld('Aplazado'), true);
    assert.equal(isFixtureHeld('Postponed'), true);
    assert.equal(isFixtureHeld('Cancelado'), true);
    assert.equal(isFixtureHeld('Retrasado'), false);
    assert.equal(isFixtureHeld('Próximo'), false);
    assert.equal(isFixturePostponed('Aplazado'), true);
    assert.equal(isFixturePostponed('Cancelado'), false);
  });
});
