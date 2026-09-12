import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  durationFromAlignment,
  estimateSpokenSeconds,
  heuristicWordTimings,
  wordsFromCharAlignment,
} from './timing';

describe('toma video timing', () => {
  it('collapses character alignment into words', () => {
    const words = wordsFromCharAlignment({
      characters: ['H', 'o', 'l', 'a', ' ', 'M', 'X'],
      character_start_times_seconds: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3],
      character_end_times_seconds: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35],
    });
    assert.equal(words.length, 2);
    assert.equal(words[0]!.word, 'Hola');
    assert.equal(words[1]!.word, 'MX');
    assert.equal(words[0]!.start, 0);
    assert.ok(words[1]!.end >= 0.35);
  });

  it('spreads heuristic timings across duration', () => {
    const words = heuristicWordTimings('Uno dos tres', 3);
    assert.equal(words.length, 3);
    assert.ok(words[0]!.start === 0);
    assert.ok(words[2]!.end <= 3.01);
  });

  it('estimates spoken seconds from word count', () => {
    const sec = estimateSpokenSeconds('palabra '.repeat(46).trim());
    assert.ok(sec >= 20);
  });

  it('durationFromAlignment pads the tail', () => {
    assert.equal(
      durationFromAlignment([{ word: 'fin', start: 10, end: 10.5 }], 5),
      10.9
    );
  });
});
