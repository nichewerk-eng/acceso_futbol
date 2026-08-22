import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NEWS_OUTRO, TOMA_OUTRO, withSpokenOutro } from './signOff';

describe('withSpokenOutro', () => {
  it('appends the Toma sign-off as the last line', () => {
    const out = withSpokenOutro('América no perdona.', TOMA_OUTRO);
    assert.equal(out, `América no perdona.\n${TOMA_OUTRO}`);
  });

  it('does not stack a second NEWS sign-off', () => {
    const once = withSpokenOutro('León ganó 2-0. Estas fueron las noticias de Acceso Futbol!', NEWS_OUTRO);
    assert.equal(once, `León ganó 2-0.\n${NEWS_OUTRO}`);
    assert.equal(withSpokenOutro(once, NEWS_OUTRO), once);
  });
});
