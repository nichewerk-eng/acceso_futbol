import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { commentLooksLikeGoal, commentStamp, pickComments, preferEspnLang } from './localizeComment';

describe('commentLooksLikeGoal', () => {
  it('accepts a real Goal! line', () => {
    assert.equal(
      commentLooksLikeGoal(
        'Goal! Toluca 2, Juárez 0. Oswaldo Virgen (Toluca) remate con derecha from very close range.'
      ),
      true
    );
  });

  it('accepts localized ¡Gol', () => {
    assert.equal(commentLooksLikeGoal('¡Gol! Helinho pone el 1-0. Asistencia: Everardo López.'), true);
  });

  it('rejects a save that mentions the goalmouth', () => {
    assert.equal(
      commentLooksLikeGoal(
        'Remate atajado · Monchu. (Juárez) right footed shot from outside the box is saved in the top centre of the goal by Hugo González (Toluca).'
      ),
      false
    );
    assert.equal(
      commentLooksLikeGoal(
        'Remate atajado · Luan. (Toluca) header from the centre of the box is saved in the top centre of the goal by Sebastián Jurado (Juárez).'
      ),
      false
    );
  });

  it('rejects provider is_goal when the line is clearly a save', () => {
    assert.equal(
      commentLooksLikeGoal(
        'Attempt saved. Oswaldo Virgen (Toluca) right footed shot from outside the box is saved in the centre of the goal.',
        true
      ),
      false
    );
  });

  it('accepts ESPN ¡Gooooool!', () => {
    assert.equal(
      commentLooksLikeGoal('¡Gooooool! Toluca 1, Juárez 0. Helinho (Toluca) remate con la derecha.'),
      true
    );
  });

  it('rejects a VAR-disallowed goal', () => {
    assert.equal(
      commentLooksLikeGoal(
        'GOL ANULADO POR EL VAR: Oswaldo Virgen (Toluca) ha marcado pero tras la revisión del VAR el gol no sube al marcador.'
      ),
      false
    );
  });
});

describe('commentStamp', () => {
  it('labels a save as Tiro, not Gol', () => {
    const s = commentStamp(
      'Remate parado alto y por el centro de la portería. Monchu (Juárez) remate con la derecha desde fuera del área.'
    );
    assert.equal(s.label, 'Tiro');
    assert.equal(s.kind, 'play');
    assert.equal(s.peak, false);
  });

  it('labels an atajada as Tiro, not Gol', () => {
    const s = commentStamp(
      'Remate atajado · Monchu (Juárez). right footed shot from outside the box is saved in the top centre of the goal.'
    );
    assert.equal(s.label, 'Tiro');
    assert.equal(s.peak, false);
  });

  it('labels anulado as VAR', () => {
    const s = commentStamp('GOL ANULADO POR EL VAR: Oswaldo Virgen (Toluca) ha marcado.');
    assert.equal(s.label, 'Anulado');
    assert.equal(s.kind, 'var');
  });
});

describe('preferEspnLang', () => {
  it('keeps Spanish when it has volume', () => {
    const es = [{ n: 1 }, { n: 2 }, { n: 3 }];
    const en = [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }];
    assert.equal(preferEspnLang(es, en).length, 3);
  });
});

describe('pickComments', () => {
  it('does not replace Spanish ESPN with longer English SM', () => {
    const es = [
      { text: '¡Gooooool! Toluca 1, Juárez 0. Helinho (Toluca) remate con la derecha.' },
      { text: 'Remate parado alto y por el centro de la portería. Monchu (Juárez).' },
      { text: 'Falta de Luan (Toluca).' },
      { text: 'Tiro de esquina, Juárez.' },
    ];
    const en = [
      ...es,
      { text: 'Goal! Toluca 2, Juárez 0. Oswaldo Virgen remate from very close range.' },
      { text: 'Attempt saved. Monchu right footed shot is saved in the top centre of the goal.' },
    ];
    const picked = pickComments(es, en);
    assert.ok(picked);
    assert.equal(picked[0]?.text.startsWith('¡Gooooool!'), true);
    assert.equal(picked.length, es.length);
  });
});
