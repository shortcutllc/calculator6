// node --test gtm/broker-holiday/broker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraft, lintDraft, colloquial, addBusinessDays, nextStep, isBusinessDay } from './broker.mjs';

const pass = (a) => lintDraft(a).filter((c) => !c.ok).map((c) => c.rule);

test('every channel builds a draft that passes its own check', () => {
  for (const channel of ['form', 'email1', 'email3', 'linkedin', 'instagram']) {
    const a = { channel, firm: 'Houtz Insurance LLC', first: 'Dana', clientType: 'mid size employers' };
    assert.deepEqual(pass({ ...a, body: buildDraft(a).body }), [], channel);
  }
});

test('firm names are colloquial', () => {
  assert.equal(colloquial('Jordan Dynamics Inc'), 'Jordan Dynamics');
  assert.equal(colloquial('Houtz Insurance, LLC.'), 'Houtz Insurance');
});

test('the check catches the mistakes that already happened', () => {
  const a = { channel: 'email1', firm: 'Houtz Insurance', first: 'Dana', clientType: 'mid size employers' };
  const good = buildDraft(a).body;
  const bad = (body) => pass({ ...a, body });
  assert.ok(bad(good.replace('Cheers,\nWill', 'Cheers, Will')).length, 'Cheers, Will on one line');
  assert.ok(bad(good.replace('Since you advise', 'I am curious whether this applies? Since you advise')).length, 'curious sentence');
  assert.ok(bad(good.replace('Can I share', 'See https://getshortcut.co/holiday. Can I share')).length, 'link in a cold email');
  assert.ok(bad(good.replace('Hi Dana,', 'Hi Dana at Houtz Insurance,')).length, 'firm name twice');
  assert.ok(bad(good.replace('Houtz Insurance', 'Houtz Insurance LLC')).length, 'LLC');
  assert.ok(bad(good.replace('a really fun and meaningful way', 'a great way')).length, 'holiday line changed');
  assert.ok(bad(good.replace('mid size employers', 'employers with 100 to 500 lives, mostly on Cigna')).length, 'stats in the Since clause');
  assert.ok(bad(good.replace(', nationwide.', ' — nationwide.')).length, 'dash');
  const form = { ...a, channel: 'form' };
  assert.ok(pass({ ...form, body: buildDraft(form).body.replace('Would also love', 'Can I share more info on our holiday packages and how funds can be applied?\n\nWould also love') }).length, 'link and share ask together');
});

test('cadence: business days, holidays skipped, never two touches inside two business days', () => {
  assert.equal(isBusinessDay('2026-11-14'), false);
  assert.equal(addBusinessDays('2026-11-09', 2), '2026-11-12'); // Veterans Day skipped
  assert.equal(addBusinessDays('2026-11-09', 5), '2026-11-17');
  assert.equal(addBusinessDays('2026-11-24', 2), '2026-11-30'); // Thanksgiving and the Friday after
  const form = { touches: '2026-11-09:form', status: 'active' };
  assert.equal(nextStep(form, '2026-11-10').dueNow, false);
  assert.match(nextStep(form, '2026-11-12').what, /^email3/);
  assert.equal(nextStep(form, '2026-11-12').dueNow, true);
  assert.match(nextStep({ touches: '2026-11-09:email1', status: 'active' }, '2026-11-12').what, /thread/);
  // A late touch pushes the next one out instead of stacking.
  assert.equal(nextStep({ touches: '2026-11-09:form;2026-11-16:email3', status: 'active' }, '2026-11-17').due, '2026-11-18');
  assert.equal(nextStep({ touches: '2026-11-09:form', status: 'replied' }, '2026-11-12').action, 'none');
  assert.equal(nextStep({ touches: '', status: 'queued', form_url: 'x' }, '2026-12-14').action, 'none');
});
