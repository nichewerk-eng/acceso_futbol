import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clubFromText } from './storyAssets';
import { heuristicNewsScenes, sampleNewsPlan } from './planScenes';

describe('news video', () => {
  it('matches clubs from headline text', () => {
    assert.equal(clubFromText('América imparable en la cima')?.id, 'america');
    assert.equal(clubFromText('Chivas visita a Pumas')?.id, 'chivas');
  });

  it('builds heuristic scenes with intro and outro', () => {
    const plan = sampleNewsPlan();
    const types = plan.scenes.map((s) => s.type);
    assert.equal(types[0], 'intro');
    assert.equal(types[types.length - 1], 'outro');
    assert.ok(plan.scenes.some((s) => s.type === 'story'));
  });

  it('heuristicNewsScenes covers duration', () => {
    const scenes = heuristicNewsScenes({
      title: 'Briefing',
      stories: [{ title: 'Uno', sourceLabel: 'A' }],
      durationSeconds: 60,
      transcript: 'x',
    });
    assert.equal(scenes[0]!.start, 0);
    assert.equal(scenes[scenes.length - 1]!.end, 60);
  });
});
