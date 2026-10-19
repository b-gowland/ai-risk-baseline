// Unit tests for the v2 classification engine (src/v2/engine), beyond the golden suite:
// trace and open_questions shape, the never-empty rule for high-risk systems, and
// principle 1 (technology never changes the legal result).

import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../../src/v2/engine/classify.js';
import { RULES } from '../../src/v2/engine/obligations.js';
import MODEL from '../../src/v2/data/answer-model.json' with { type: 'json' };
import PURPOSES from '../../src/v2/data/purposes.json' with { type: 'json' };
import EU from '../../src/v2/data/eu-obligations.json' with { type: 'json' };
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const field = id => MODEL.fields.find(f => f.id === id);
const base = (over = {}) => ({ ...SUITE.defaults, ...over });
const gates = r => r.open_questions.map(q => q.gate);

test('every obligation in eu-obligations.json has a rule', () => {
  const missing = EU.obligations.map(o => o.id).filter(id => !/^eu\.art_5_1/.test(id) && !RULES[id]);
  assert.deepEqual(missing, []);
});

test('trace: an in-scope result records steps 0-6, the tier and the obligations', () => {
  const r = classify(base({ purpose: 'credit_scoring', role: ['build_own_use'] }));
  const steps = new Set(r.trace.map(t => t.step));
  for (const s of [0, 1, 2, 3, 4, 5, 6, 'status', 'obligations', 'tier']) assert.ok(steps.has(s), `missing step ${s}`);
  for (const t of r.trace) {
    assert.equal(typeof t.rule, 'string');
    assert.ok(Array.isArray(t.because) && t.because.length, `empty because for ${t.rule}`);
  }
  assert.ok(r.trace.some(t => t.step === 3 && t.rule.includes('5(b)') && t.because.includes('purpose=credit_scoring')));
  assert.ok(r.trace.some(t => t.step === 'obligations' && t.rule.startsWith('Art. 27')));
});

test('trace: out of scope stops at step 0 and still produces the tier', () => {
  const r = classify(base({ purpose: 'credit_scoring', eu_nexus: 'no' }));
  assert.equal(r.status, 'out_of_scope');
  assert.deepEqual(r.obligations, []);
  assert.ok(!r.trace.some(t => [1, 2, 3, 4, 5].includes(t.step)));
  assert.ok(r.trace.some(t => t.step === 'tier'));
});

test('trace: the Art. 6(3) derogation tells a deployer to get the vendor assessment', () => {
  const r = classify(base({ purpose: 'recruitment_selection', art_6_3: { preparatory: 'yes' } }));
  assert.equal(r.status, 'not_high_risk_6_3');
  assert.ok(r.trace.some(t => t.step === 4 && /vendor/.test(t.rule)));
  assert.ok(!r.obligations.includes('eu.art_6_4'), 'Art. 6(4) is the provider duty');
});

test('trace: a deployer of a vendor chatbot is told Art. 50(1) sits with the provider', () => {
  const r = classify(base({ purpose: 'customer_service_assistant', interaction: ['interacts_directly'] }));
  assert.equal(r.status, 'transparency');
  assert.ok(!r.obligations.includes('eu.art_50_1'));
  assert.ok(r.notes.some(n => n.ref === 'Art. 50(1)' && /provider/.test(n.text)));
});

test('open_questions: shape, blocking flags and conservative assumptions', () => {
  const r = classify(base({
    purpose: 'unsure', eu_nexus: 'unsure', role: ['unsure'], org_type: 'unsure', annex_i_product: 'unsure',
    prohibited: { art_5_1a: 'unsure' }, severity: 'unsure', autonomy: 'unsure', reversible: 'unsure',
  }));
  for (const q of r.open_questions) {
    assert.deepEqual(Object.keys(q).sort(), ['assumption', 'blocking', 'field', 'gate']);
    assert.ok(q.assumption.length > 0);
  }
  const blocking = r.open_questions.filter(q => q.blocking).map(q => q.gate).sort();
  assert.deepEqual(blocking, ['prohibited.art_5_1a', 'purpose']);
  for (const g of ['eu_nexus', 'role', 'annex_i', 'org_type', 'severity', 'autonomy', 'reversible']) assert.ok(gates(r).includes(g), g);
  assert.equal(r.status, 'high_risk');
  assert.equal(r.provisional, true);
  // Unknown Annex III point and unknown org type: the conservative deployer duties apply.
  for (const k of ['eu.art_27', 'eu.art_49_3', 'eu.art_86']) assert.ok(r.obligations.includes(k), k);
});

test('open_questions: unanswered fields are treated as unsure', () => {
  const r = classify({ purpose: 'credit_scoring' });
  assert.equal(r.scope, 'undetermined');
  for (const g of ['eu_nexus', 'scope_exclusion', 'role', 'org_type', 'severity']) assert.ok(gates(r).includes(g), g);
  assert.equal(r.provisional, true);
});

test('open_questions: tier-only and GPAI threshold questions do not make the result provisional', () => {
  const r = classify(base({ purpose: 'document_processing', severity: 'unsure', role: ['gpai_model_provider'] }));
  assert.deepEqual(gates(r).sort(), ['gpai_systemic', 'severity']);
  assert.equal(r.provisional, false);
});

test('open_questions: org_type unsure that only decides the FRIA is still recorded', () => {
  const r = classify(base({ purpose: 'education_assessment', org_type: 'unsure' }));
  assert.ok(gates(r).includes('org_type'));
  assert.ok(r.obligations.includes('eu.art_27'));
  assert.equal(r.provisional, true);
});

test('open_questions: an unresolved prohibition keeps an open-source system in scope', () => {
  const r = classify(base({
    purpose: 'content_generation', scope_exclusion: 'free_open_source', role: ['build_supply'],
    prohibited: { art_5_1a: 'unsure' },
  }));
  assert.notEqual(r.status, 'out_of_scope');
  assert.equal(r.scope, 'undetermined');
  assert.ok(r.open_questions.some(q => q.gate === 'prohibited.art_5_1a' && q.blocking));
});

// Every role subset of size 0-2, so combined roles are covered too.
function roleSets() {
  const values = field('role').values;
  const sets = [[]];
  values.forEach((a, i) => { sets.push([a]); values.slice(i + 1).forEach(b => sets.push([a, b])); });
  return sets;
}

test('no answer combination yields empty obligations for an in-scope high-risk system', () => {
  const purposes = [...PURPOSES.purposes.map(p => p.id), 'unsure'];
  const art63 = [{}, { profiling: 'yes' }, { profiling: 'unsure' }, { narrow_procedural: 'yes' }, { preparatory: 'unsure' }];
  let highRisk = 0;
  const empty = [];
  for (const purpose of purposes) for (const role of roleSets()) for (const org_type of field('org_type').values)
    for (const annex_i_product of field('annex_i_product').values) for (const art_6_3 of art63)
      for (const scope_exclusion of ['none', 'free_open_source', 'unsure']) {
        const r = classify(base({ purpose, role, org_type, annex_i_product, art_6_3, scope_exclusion }));
        if (r.status !== 'high_risk' || r.scope === 'out') continue;
        highRisk++;
        if (!r.obligations.length) empty.push(JSON.stringify({ purpose, role, org_type, annex_i_product, art_6_3 }));
        // Every listed obligation is held by one of the user's roles.
        for (const k of r.obligations) {
          const o = EU.obligations.find(x => x.id === k);
          assert.ok(o.role.some(x => r.roles.includes(x)), `${k} listed without a holding role`);
        }
      }
  assert.ok(highRisk > 10000, `only ${highRisk} high-risk combinations explored`);
  assert.deepEqual(empty.slice(0, 5), []);
});

test('principle 1: technology never changes the legal result', () => {
  for (const p of PURPOSES.purposes) {
    const ref = classify(base({ purpose: p.id, tech: [] }));
    for (const t of field('tech').values) {
      const r = classify(base({ purpose: p.id, tech: [t] }));
      assert.equal(r.status, ref.status, `${p.id} + ${t}`);
      assert.equal(r.basis, ref.basis, `${p.id} + ${t}`);
      assert.deepEqual(r.obligations, ref.obligations, `${p.id} + ${t}`);
    }
  }
});
