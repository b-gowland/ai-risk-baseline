// Unit tests for the v2 questionnaire flow, labels and presentation helpers (src/v2/ui).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annexIIIMatched, isFieldVisible, visiblePractices, visibleGates, missingInGate,
  unansweredPractices, isComplete, pruneHidden, toggleMulti,
} from '../../src/v2/ui/flow.js';
import { GATES, VALUE_LABELS, FIELD_TITLES, valueLabel, OPEN_QUESTION_TEXT } from '../../src/v2/ui/labels.js';
import { allowedValues } from '../../src/v2/ui/url-state.js';
import { firstActions, obligationsByRole, requirementsByGate, tierExpectations, basesLabels } from '../../src/v2/ui/present.js';
import { classify } from '../../src/v2/engine/classify.js';
import MODEL from '../../src/v2/data/answer-model.json' with { type: 'json' };
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const gate = id => GATES.find(g => g.id === id);
const today = '2026-10-20';

test('every model field sits in exactly one gate, in model order', () => {
  const inGates = GATES.flatMap(g => g.fields);
  assert.deepEqual([...inGates].sort(), MODEL.fields.map(f => f.id).sort());
  assert.equal(new Set(inGates).size, inGates.length);
});

test('every model value has a label and every field a title', () => {
  for (const f of MODEL.fields) {
    assert.ok(FIELD_TITLES[f.id], `title for ${f.id}`);
    if (f.id === 'purpose') continue;
    // prohibited keys are labelled by the practice's own title.
    const values = f.type === 'map' ? [...(f.keys || []), ...f.values] : allowedValues(f);
    for (const v of values) assert.notEqual(valueLabel(f.id, v), v, `label for ${f.id}.${v}`);
  }
  assert.ok(VALUE_LABELS.common.unsure);
});

test('annex_iii_matched follows the purpose and its condition', () => {
  assert.equal(annexIIIMatched({}), false);
  assert.equal(annexIIIMatched({ purpose: 'credit_scoring' }), true);
  assert.equal(annexIIIMatched({ purpose: 'fraud_detection' }), false);
  assert.equal(annexIIIMatched({ purpose: 'unsure' }), true);
  assert.equal(annexIIIMatched({ purpose: 'public_benefits_eligibility', org_type: 'private' }), false);
  assert.equal(annexIIIMatched({ purpose: 'public_benefits_eligibility', org_type: 'public_authority' }), true);
  assert.equal(isFieldVisible('art_6_3', { purpose: 'credit_scoring' }), true);
  assert.equal(isFieldVisible('art_6_3', { purpose: 'code_assistant' }), false);
});

test('Annex I and Art. 6(3) gates appear only when relevant', () => {
  const ids = a => visibleGates(a).map(g => g.id);
  assert.ok(!ids({ purpose: 'code_assistant' }).includes('product'));
  assert.ok(!ids({ purpose: 'code_assistant' }).includes('art_6_3'));
  assert.ok(ids({ purpose: 'medical_clinical_support' }).includes('product'));
  assert.ok(ids({ purpose: 'recruitment_selection' }).includes('art_6_3'));
  assert.ok(ids({ purpose: 'unsure' }).includes('product') && ids({ purpose: 'unsure' }).includes('art_6_3'));
});

test('prohibited screen shows only matching items, and later answers can add items', () => {
  assert.deepEqual(visiblePractices({ purpose: 'code_assistant' }), []);
  assert.equal(visiblePractices({ purpose: 'unsure' }).length, 10);
  const later = { purpose: 'code_assistant', prohibited: {}, tech: ['llm_genai'] };
  assert.deepEqual(unansweredPractices(later).map(p => p.id), ['art_5_1a']);
  assert.equal(isComplete(later), false);
});

test('a gate needs its visible required questions answered; unsure counts', () => {
  assert.deepEqual(missingInGate(gate('scope'), {}), ['eu_nexus', 'scope_exclusion']);
  assert.deepEqual(missingInGate(gate('scope'), { eu_nexus: 'unsure', scope_exclusion: 'unsure' }), []);
  assert.deepEqual(missingInGate(gate('role'), { role: [] }), ['role', 'org_type', 'org_size']);
  // Optional multi-selects (no 'unsure') never block.
  assert.deepEqual(missingInGate(gate('data_tech'), {}), []);
  assert.deepEqual(missingInGate(gate('transparency'), {}), []);
});

test('pruneHidden drops answers to hidden questions and screen items', () => {
  const a = { purpose: 'code_assistant', annex_i_product: 'yes', art_6_3: { profiling: 'no' }, prohibited: { art_5_1h: 'no' }, stage: 'idea' };
  assert.deepEqual(pruneHidden(a), { purpose: 'code_assistant', stage: 'idea' });
});

test('toggleMulti keeps unsure and none exclusive', () => {
  assert.deepEqual(toggleMulti(['staff'], 'customers'), ['staff', 'customers']);
  assert.deepEqual(toggleMulti(['staff'], 'unsure'), ['unsure']);
  assert.deepEqual(toggleMulti(['unsure'], 'build_own_use'), ['build_own_use']);
  assert.deepEqual(toggleMulti(['personal', 'children'], 'none'), ['none']);
  assert.deepEqual(toggleMulti(['personal'], 'personal'), []);
});

test('every engine open-question gate has escalation text', () => {
  const gates = new Set();
  for (const s of SUITE.scenarios) {
    for (const q of classify({ ...SUITE.defaults, ...s.answers }, { today }).open_questions) gates.add(q.gate);
  }
  for (const g of gates) assert.ok(g.startsWith('prohibited.') || OPEN_QUESTION_TEXT[g], `text for ${g}`);
});

test('fallback first actions: at most 5, blocking questions first', () => {
  const s = SUITE.scenarios.find(x => x.id === 'G47');
  const r = { ...classify({ ...SUITE.defaults, ...s.answers }, { today }), requirements: undefined, actions: undefined };
  const a = firstActions(r);
  assert.equal(a.derived, true);
  assert.ok(a.items.length > 0 && a.items.length <= 5);
  assert.match(a.items[0].title, /^Resolve:/);
  assert.deepEqual(a.items.map(x => x.rank), a.items.map((_, i) => i + 1));
});

test('engine actions lead with the classification record and blocking questions', () => {
  const s = SUITE.scenarios.find(x => x.id === 'G47');
  const a = firstActions(classify({ ...SUITE.defaults, ...s.answers }, { today }));
  assert.equal(a.derived, false);
  assert.ok(a.items.length > 0 && a.items.length <= 5);
  assert.equal(a.items[0].requirement_id, 'uc.classification_record');
  assert.match(a.items[0].title, /^Resolve/);
});

test('result.actions and result.requirements are used when present', () => {
  const r = {
    ...classify({ ...SUITE.defaults, purpose: 'credit_scoring' }, { today }),
    requirements: [
      { id: 'r2', title: 'Monitor', gate: 'operate', level: 'use_case', sources: [] },
      { id: 'r1', title: 'Classify', gate: 'classify', level: 'org', sources: [] },
    ],
    actions: [{ rank: 2, requirement_id: 'r2', title: 'Monitor', why: 'b' }, { rank: 1, requirement_id: 'r1', title: 'Classify', why: 'a' }],
  };
  assert.deepEqual(firstActions(r), { derived: false, items: [
    { rank: 1, title: 'Classify', why: 'a', requirement_id: 'r1' },
    { rank: 2, title: 'Monitor', why: 'b', requirement_id: 'r2' },
  ] });
  assert.deepEqual(requirementsByGate(r).map(g => g.gate), ['classify', 'operate']);
});

test('obligations fallback groups every obligation under a role', () => {
  for (const s of SUITE.scenarios) {
    const r = classify({ ...SUITE.defaults, ...s.answers }, { today });
    const listed = new Set(obligationsByRole(r).flatMap(g => g.items.map(i => i.id)));
    assert.deepEqual([...listed].sort(), [...r.obligations].sort(), s.id);
  }
});

test('tier expectations are cumulative without back-references', () => {
  assert.deepEqual(tierExpectations(3).map(t => t.tier), [1, 2, 3]);
  assert.ok(tierExpectations(4).every(t => t.items.every(i => !/^Tier \d$/.test(i))));
  assert.deepEqual(tierExpectations('P'), []);
});

test('basis labels: purpose unsure still names a basis', () => {
  const r = classify({ purpose: 'unsure' }, { today });
  assert.equal(r.status, 'high_risk');
  assert.ok(basesLabels(r).length >= 1);
});

test('basis labels: a prohibited system shows only its Art. 5 basis', () => {
  for (const s of SUITE.scenarios.filter(x => x.expect.status === 'prohibited')) {
    const r = classify({ ...SUITE.defaults, ...s.answers }, { today });
    const labels = basesLabels(r);
    assert.equal(labels.length, 1, s.id);
    assert.match(labels[0], /^Art\. 5/, s.id);
  }
});
