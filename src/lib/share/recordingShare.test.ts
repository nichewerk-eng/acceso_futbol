import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clipShareText,
  newsShareCopy,
  newsSharePath,
  parseNewsBriefId,
  parseTomaEpisodeId,
  recordingFileName,
  tomaShareCopy,
  tomaSharePath,
} from './recordingShare';

describe('recordingShare', () => {
  it('clips the script so the share message stays short', () => {
    const long = `${'Gol. '.repeat(80)}Fin.`;
    const clip = clipShareText(long);
    assert.ok(clip.length <= 280);
    assert.ok(clip.endsWith('…'));
  });

  it('builds a Toma caption with jornada + script', () => {
    const copy = tomaShareCopy({
      title: 'Viernes de primera sangre',
      cue: 'Arranque de fecha.',
      jornadaNum: 5,
      transcript: 'América no perdona en el Azteca. León se queda corto.',
    });
    assert.equal(copy.title, 'AF://TOMA · Viernes de primera sangre');
    assert.match(copy.text, /^J5 · América/);
  });

  it('builds a NEWS caption from the briefing script', () => {
    const copy = newsShareCopy({
      title: 'Briefing de la mañana',
      slot: 'am',
      transcript: 'Chivas busca centro delantero. El Tri cita a la fecha FIFA.',
    });
    assert.equal(copy.title, 'AF://NEWS · Briefing de la mañana');
    assert.match(copy.text, /^Mañana · Chivas/);
  });

  it('parses episode ids and share paths', () => {
    assert.deepEqual(parseTomaEpisodeId('toma-ep-j5-2026-08-21'), {
      jornadaNum: 5,
      dayKey: '2026-08-21',
    });
    assert.deepEqual(parseTomaEpisodeId('toma-ep-j5-antes'), {
      jornadaNum: 5,
      dayKey: 'antes',
    });
    assert.equal(parseTomaEpisodeId('toma-ep-j5-../x'), null);
    assert.deepEqual(parseNewsBriefId('news-brief-2026-08-22-am'), {
      dayKey: '2026-08-22',
      slot: 'am',
    });
    assert.equal(parseNewsBriefId('news-brief-2026-08-22-xx'), null);
    assert.equal(tomaSharePath('toma-ep-j5-2026-08-21'), '/toma/toma-ep-j5-2026-08-21');
    assert.equal(newsSharePath('news-brief-2026-08-22-am'), '/news/news-brief-2026-08-22-am');
    assert.equal(
      recordingFileName('toma', 'toma-ep-j5-2026-08-21'),
      'AF-TOMA-toma-ep-j5-2026-08-21.mp3'
    );
  });
});
