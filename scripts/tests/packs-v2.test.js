// Country packs (spec §11): GDPR, UK and Australia. Schema checks plus the triggers that
// decide when each pack and each pack requirement applies.

import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../../src/v2/engine/classify.js';
import { PACKS, PREDICATE_LEAVES, GATES } from '../../src/v2/engine/requirements.js';
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const today = '2026-10-20';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const run = (id, extra = {}) => classify({ ...SUITE.defaults, ...SUITE.scenarios.find(s => s.id === id).answers, ...extra }, { today });
const packIds = (r, pack) => r.requirements.filter(q => q.pack === pack).map(q => q.id);

function leaves(pred, out = []) {
  if (pred.all || pred.any) (pred.all || pred.any).forEach(p => leaves(p, out));
  else out.push(Object.keys(pred)[0]);
  return out;
}

test('packs: ids, frameworks, sources and predicates are well formed', () => {
  assert.deepEqual(PACKS.map(p => p.id), ['gdpr', 'uk', 'au']);
  const seen = new Set();
  for (const p of PACKS) {
    for (const [id, fw] of Object.entries(p.frameworks)) {
      assert.ok(fw.title && fw.url && fw.source_note, `${p.id}/${id}`);
      assert.match(fw.last_verified, ISO_DATE, `${p.id}/${id}`);
    }
    for (const r of p.requirements) {
      assert.ok(r.id.startsWith(`${p.id}.`), r.id);
      assert.ok(!seen.has(r.id), `duplicate ${r.id}`);
      seen.add(r.id);
      assert.ok(GATES.includes(r.gate), `${r.id} gate`);
      assert.ok(['org', 'use_case'].includes(r.level), `${r.id} level`);
      assert.ok(r.artefact && r.summary && r.owners.length && r.effort, `${r.id} fields`);
      if (r.effective_from) assert.match(r.effective_from, ISO_DATE, r.id);
      for (const s of r.sources) assert.ok(p.frameworks[s.framework], `${r.id}: framework ${s.framework}`);
      for (const l of leaves(r.applies)) assert.ok(PREDICATE_LEAVES.includes(l), `${r.id}: leaf ${l}`);
      assert.ok(leaves(r.applies).includes('jurisdiction'), `${r.id}: every pack requirement names its jurisdiction`);
    }
  }
});

test('GDPR is added automatically with an EU connection and personal data', () => {
  const g09 = packIds(run('G09'), 'gdpr');
  assert.ok(g09.includes('gdpr.lawful_basis'));
  assert.ok(g09.includes('gdpr.dpia'), 'tier 3 needs a DPIA');
  assert.ok(g09.includes('gdpr.automated_decisions'), 'autonomous credit decisions');
  assert.deepEqual(packIds(run('G33'), 'gdpr'), [], 'no EU nexus');
  assert.deepEqual(packIds(run('G19'), 'gdpr'), [], 'no personal data');
  assert.deepEqual(packIds(run('G54'), 'gdpr'), [], 'purely personal use is outside GDPR');
  assert.ok(packIds(run('G34'), 'gdpr').includes('gdpr.lawful_basis'), 'EU nexus unsure: include cautiously');
});

test('GDPR Art. 22 needs significant effects and no person deciding each case', () => {
  assert.ok(!packIds(run('G09', { autonomy: 'human_decides' }), 'gdpr').includes('gdpr.automated_decisions'));
  assert.ok(!packIds(run('G09', { severity: 'minor' }), 'gdpr').includes('gdpr.automated_decisions'));
  assert.ok(packIds(run('G09', { autonomy: 'human_oversight' }), 'gdpr').includes('gdpr.automated_decisions'),
    'sample review is not meaningful involvement in each decision');
});

test('GDPR processor terms apply to vendor systems and third-party models', () => {
  assert.ok(packIds(run('G25'), 'gdpr').includes('gdpr.processors_transfers'));
  assert.ok(!packIds(run('G10'), 'gdpr').includes('gdpr.processors_transfers'));
});

test('UK and AU packs are added only when selected', () => {
  const none = run('G09');
  assert.deepEqual([...packIds(none, 'uk'), ...packIds(none, 'au')], []);
  const both = run('G09', { other_jurisdictions: ['uk', 'au'] });
  const uk = both.requirements.find(q => q.id === 'uk.automated_decisions');
  assert.equal(uk.effective_from, '2026-02-05');
  const au = both.requirements.find(q => q.id === 'au.automated_decisions_policy');
  assert.equal(au.effective_from, '2026-12-10');
});

test('AU: the national AI guidance applies even without personal data; APP items need it', () => {
  const r = run('G38', { other_jurisdictions: ['au'], data: ['none'] });
  assert.deepEqual(packIds(r, 'au'), ['au.ai_guidance']);
});

test('AU APP 1.7 covers decision support as well as automated decisions', () => {
  const r = run('G09', { other_jurisdictions: ['au'], autonomy: 'human_decides' });
  assert.ok(packIds(r, 'au').includes('au.automated_decisions_policy'));
});

test('packs never apply to a prohibited use case', () => {
  const r = run('G01', { other_jurisdictions: ['uk', 'au'] });
  assert.deepEqual(r.requirements.filter(q => q.pack), []);
});

test('pack requirements never become first actions', () => {
  for (const s of SUITE.scenarios) {
    const r = classify({ ...SUITE.defaults, ...s.answers, other_jurisdictions: ['uk', 'au'] }, { today });
    const pack = new Set(r.requirements.filter(q => q.pack).map(q => q.id));
    assert.ok(r.actions.every(a => !pack.has(a.requirement_id)), s.id);
  }
});
