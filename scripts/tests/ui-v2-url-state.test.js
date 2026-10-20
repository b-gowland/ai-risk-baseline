// Unit tests for the v2 URL state (src/v2/ui/url-state.js): encode/decode must round-trip
// every golden scenario's answers, both as written and merged with the suite defaults.

import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAnswers, decodeAnswers, PARAM_KEYS, NAME_MAX } from '../../src/v2/ui/url-state.js';
import { classify } from '../../src/v2/engine/classify.js';
import MODEL from '../../src/v2/data/answer-model.json' with { type: 'json' };
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const roundTrip = (answers, name) => decodeAnswers(new URLSearchParams(encodeAnswers(answers, name).toString()));

for (const s of SUITE.scenarios) {
  test(`${s.id}: answers round-trip through the URL`, () => {
    assert.deepEqual(roundTrip(s.answers).answers, s.answers);
    const merged = { ...SUITE.defaults, ...s.answers };
    assert.deepEqual(roundTrip(merged).answers, merged);
  });
  test(`${s.id}: the decoded answers classify the same`, () => {
    const merged = { ...SUITE.defaults, ...s.answers };
    const today = '2026-10-20';
    assert.deepEqual(classify(roundTrip(merged).answers, { today }), classify(merged, { today }));
  });
}

test('every model field has a unique param key', () => {
  const ids = MODEL.fields.map(f => f.id);
  assert.deepEqual(Object.keys(PARAM_KEYS).sort(), [...ids].sort());
  const keys = Object.values(PARAM_KEYS);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(!keys.includes('v') && !keys.includes('n'));
});

test('version is required', () => {
  const params = encodeAnswers({ purpose: 'credit_scoring' });
  assert.equal(params.get('v'), '2');
  params.set('v', '1');
  assert.equal(decodeAnswers(params), null);
  assert.equal(decodeAnswers('p=credit_scoring'), null);
});

test('empty multi-select is kept as an answered empty list', () => {
  assert.deepEqual(roundTrip({ interaction: [] }).answers, { interaction: [] });
  assert.deepEqual(roundTrip({}).answers, {});
});

test('every map key and value round-trips', () => {
  const prohibited = { art_5_1a: 'yes', art_5_1b: 'no', art_5_1ba: 'unsure', art_5_1bb: 'yes', art_5_1h: 'unsure' };
  const art_6_3 = Object.fromEntries(MODEL.fields.find(f => f.id === 'art_6_3').keys.map((k, i) => [k, ['yes', 'no', 'unsure'][i % 3]]));
  assert.deepEqual(roundTrip({ prohibited, art_6_3 }).answers, { prohibited, art_6_3 });
});

test('unknown values and keys are dropped on decode', () => {
  const params = new URLSearchParams('v=2&p=not_a_purpose&r=build_own_use.hacker&x=zzy.au&eu=maybe&d63=npq');
  assert.deepEqual(decodeAnswers(params).answers, { role: ['build_own_use'], prohibited: { art_5_1a: 'unsure' }, art_6_3: {} });
});

test('name is trimmed, capped and round-trips', () => {
  assert.equal(roundTrip({}, '  Credit model  ').name, 'Credit model');
  assert.equal(roundTrip({}, 'x'.repeat(500)).name.length, NAME_MAX);
  assert.equal(roundTrip({}, 'a & b = c?').name, 'a & b = c?');
});
