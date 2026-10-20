import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInquiryMailto, inquiryBody } from './inquiry';
import { mediaKit } from '@/config/mediaKit';
import { mediaKitEn } from '@/config/mediaKit.en';

const inquiry = { brand: 'Marca & Co. / México', goal: 'Registro? #fútbol\nSegunda línea', dates: 'Nov 1–15; por confirmar', budget: '', packageName: 'Campaña piloto' };

test('email draft preserves accented text, delimiters and line breaks without adding recipients', () => {
  const url = new URL(buildInquiryMailto(inquiry, 'es'));
  assert.equal(url.protocol, 'mailto:');
  assert.equal(url.pathname, 'info@accesofutbol.com');
  assert.equal(url.searchParams.get('subject'), 'Propuesta de patrocinio AF: Campaña piloto');
  assert.equal(url.searchParams.get('body'), inquiryBody(inquiry, 'es'));
  assert.match(url.searchParams.get('body')!, /Registro\? #fútbol\nSegunda línea/);
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
});

test('English brief labels all requested fields and keeps budget optional', () => {
  const body = inquiryBody(inquiry, 'en');
  for (const label of ['Brand / company:', 'Campaign goal:', 'Desired dates:', 'Budget / currency (optional): —', 'Campaign:']) assert.ok(body.includes(label));
  assert.match(new URL(buildInquiryMailto(inquiry, 'en')).searchParams.get('subject')!, /^AF sponsorship proposal:/);
});

test('both editions preserve verified totals, windows and medians', () => {
  for (const kit of [mediaKit, mediaKitEn]) {
    assert.equal(kit.platforms.reduce((sum, p) => sum + p.views, 0), 1621535);
    assert.equal(kit.platforms.reduce((sum, p) => sum + p.followers, 0), 42858);
    assert.deepEqual(kit.platforms.map(p => p.median), [7927, 3973, 468, 1951]);
    assert.deepEqual(kit.platforms.map(p => p.views), mediaKit.platforms.map(p => p.views));
    assert.ok(kit.notes.medians.includes('30'));
    assert.ok(kit.notes.geography.includes('95.22%') && kit.notes.geography.includes('91.69%'));
  }
});

test('packages distinguish original production from distribution without changing quantities', () => {
  for (const kit of [mediaKit, mediaKitEn]) {
    assert.deepEqual(kit.packages.map(p => p.id), ['piloto', 'mensual', 'evento']);
    assert.match(kit.packages[0].deliverables[0], /^2 /);
    assert.match(kit.packages[0].deliverables[1], /8 /);
    assert.match(kit.packages[0].deliverables[2], /^2 /);
    assert.match(kit.packages[1].deliverables[0], /^8 /);
    assert.match(kit.packages[1].deliverables[1], /32 /);
    assert.match(kit.packages[1].deliverables[2], /4 .*4 /);
    assert.match(kit.packages[2].deliverables[0], /^2 /);
    assert.match(kit.packages[2].deliverables[1], /8 /);
    assert.match(kit.packages[2].deliverables[2], /^4 /);
  }
});
