import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { kickHold, kickHoldLabel, localizeStatus } from './localizeEs';

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
