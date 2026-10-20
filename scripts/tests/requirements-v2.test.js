// Tests for the v2 requirements library (src/v2/data/requirements.json) and the
// first-5-actions function (docs/v2/classification-spec.md §10): schema validity, the
// crosswalk vocabulary, the never-empty rule, action ordering and golden spot checks.

import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../../src/v2/engine/classify.js';
import { GATES, PREDICATE_LEAVES, PACKS, leafValues } from '../../src/v2/engine/requirements.js';
import LIB from '../../src/v2/data/requirements.json' with { type: 'json' };
import MODEL from '../../src/v2/data/answer-model.json' with { type: 'json' };
import PURPOSES from '../../src/v2/data/purposes.json' with { type: 'json' };
import EU from '../../src/v2/data/eu-obligations.json' with { type: 'json' };
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const FRAMEWORKS = ['eu_ai_act', 'iso_42001', 'iso_23894', 'iso_42005', 'nist_ai_rmf', 'nist_ai_600_1'];
const LEVELS = ['org', 'use_case'];
const OWNERS = ['risk', 'legal', 'tech', 'procurement'];
const EFFORTS = ['Low', 'Medium', 'High'];
const STATUSES = ['prohibited', 'high_risk', 'not_high_risk_6_3', 'transparency', 'minimal', 'out_of_scope'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const OBLIGATION_IDS = new Set(EU.obligations.map(o => o.id));

// NIST AI 100-1 (AI RMF 1.0) subcategories, checked against the PDF on 2026-10-20.
const NIST_SUBCATEGORIES = new Set([
  ...[1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 6.1, 6.2].map(n => `GOVERN ${n.toFixed(1)}`),
  ...['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '2.1', '2.2', '2.3', '3.1', '3.2', '3.3', '3.4', '3.5', '4.1', '4.2', '5.1', '5.2'].map(n => `MAP ${n}`),
  ...['1.1', '1.2', '1.3', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13', '3.1', '3.2', '3.3', '4.1', '4.2', '4.3'].map(n => `MEASURE ${n}`),
  ...['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '4.1', '4.2', '4.3'].map(n => `MANAGE ${n}`),
]);
const REFS = {
  eu_ai_act: /^(Art\.|Arts\.)/,
  iso_42001: /^(Cl\. ([4-9]|10)(\.\d+)*(-10)?|A\.([2-9]|10)\.\d+(\.\d+)?)$/,
  iso_23894: /^Cl\. \d+(\.\d+)*$/,
  iso_42005: /^Cl\. [56]$/,
  nist_ai_rmf: { test: ref => NIST_SUBCATEGORIES.has(ref) },
  nist_ai_600_1: /^Section [23]/,
};

const base = (over = {}) => ({ ...SUITE.defaults, ...over });
const golden = id => {
  const s = SUITE.scenarios.find(x => x.id === id);
  return classify(base(s.answers));
};
const ids = r => r.requirements.map(q => q.id);
const cites = (r, ref) => r.requirements.some(q => q.sources.some(s => s.framework === 'eu_ai_act' && s.ref === ref));

function walk(pred, fn) {
  if (pred.all || pred.any) return (pred.all || pred.any).forEach(p => walk(p, fn));
  fn(...Object.entries(pred)[0]);
}

// ---- library schema --------------------------------------------------------

test('library: the NIST subcategory list has all 72 ids', () => {
  assert.equal(NIST_SUBCATEGORIES.size, 72);
});

test('library: every framework has a title, url and last_verified date', () => {
  assert.deepEqual(Object.keys(LIB.frameworks).sort(), [...FRAMEWORKS].sort());
  for (const [k, f] of Object.entries(LIB.frameworks)) {
    assert.ok(f.title && /^https:\/\//.test(f.url), k);
    assert.match(f.last_verified, ISO_DATE, k);
  }
  assert.equal(LIB.nist_ai_600_1_risks.length, 12);
});

test('library: every requirement is schema-valid', () => {
  const seen = new Set();
  for (const r of LIB.requirements) {
    assert.ok(/^(org|uc)\.[a-z0-9_]+$/.test(r.id), `bad id ${r.id}`);
    assert.ok(!seen.has(r.id), `duplicate ${r.id}`);
    seen.add(r.id);
    assert.ok(r.title && r.summary, `${r.id}: title and summary`);
    assert.ok(LEVELS.includes(r.level), `${r.id}: level`);
    assert.equal(r.level === 'org', r.id.startsWith('org.'), `${r.id}: id prefix matches level`);
    assert.ok(GATES.includes(r.gate), `${r.id}: gate`);
    assert.ok(typeof r.artefact === 'string' && r.artefact.length > 20, `${r.id}: artefact says what done looks like`);
    assert.ok(r.owners.length && r.owners.every(o => OWNERS.includes(o)), `${r.id}: owners`);
    assert.ok(EFFORTS.includes(r.effort), `${r.id}: effort`);
    assert.ok(r.sources.length, `${r.id}: sources`);
    if (r.eu_variant) {
      assert.ok(r.sources.some(s => s.obligation), `${r.id}: eu_variant without an EU obligation source`);
      if (r.eu_variant.effort) assert.ok(EFFORTS.includes(r.eu_variant.effort));
    }
    walk(r.applies, (leaf, arg) => {
      assert.ok(PREDICATE_LEAVES.includes(leaf), `${r.id}: unknown leaf ${leaf}`);
      if (leaf === 'obligation') arg.forEach(k => assert.ok(OBLIGATION_IDS.has(k), `${r.id}: unknown obligation ${k}`));
      if (leaf === 'status') arg.forEach(s => assert.ok(STATUSES.includes(s), `${r.id}: unknown status ${s}`));
      if (leaf === 'tier_min') assert.ok([1, 2, 3, 4].includes(arg));
      if (leaf === 'role' || leaf === 'tech') arg.forEach(v => assert.ok(leafValues(leaf).includes(v), `${r.id}: ${leaf}=${v}`));
    });
  }
});

test('crosswalk: every source uses a valid framework and a well-formed ref', () => {
  for (const r of LIB.requirements) for (const s of r.sources) {
    assert.ok(FRAMEWORKS.includes(s.framework), `${r.id}: framework ${s.framework}`);
    assert.ok(REFS[s.framework].test(s.ref), `${r.id}: ${s.framework} ref '${s.ref}'`);
    if (s.obligation) {
      assert.equal(s.framework, 'eu_ai_act');
      assert.ok(OBLIGATION_IDS.has(s.obligation), `${r.id}: unknown obligation ${s.obligation}`);
    }
  }
});

test('crosswalk: every EU obligation key maps to exactly one requirement', () => {
  const owner = new Map();
  for (const r of LIB.requirements) for (const s of r.sources) {
    if (!s.obligation) continue;
    assert.ok(!owner.has(s.obligation) || owner.get(s.obligation) === r.id, `${s.obligation} in ${owner.get(s.obligation)} and ${r.id}`);
    owner.set(s.obligation, r.id);
  }
  assert.deepEqual([...OBLIGATION_IDS].filter(k => !owner.has(k)), []);
});

test('crosswalk: EU-driven requirements also cite ISO/IEC 42001 or NIST AI RMF', () => {
  for (const r of LIB.requirements) {
    if (!r.sources.some(s => s.obligation)) continue;
    assert.ok(r.sources.some(s => ['iso_42001', 'nist_ai_rmf'].includes(s.framework)), r.id);
  }
});

test('tier core: the tier-matrix expectations are all covered', () => {
  const tierMin = id => {
    let min = null;
    walk(LIB.requirements.find(r => r.id === id).applies, (leaf, arg) => { if (leaf === 'tier_min') min = arg; });
    return min;
  };
  const expected = {
    'org.ai_inventory': 1, 'uc.owner': 1, 'org.ai_policy': 1, 'org.ai_literacy': 1,
    'uc.risk_assessment': 2, 'uc.transparency': 2, 'uc.vendor_due_diligence': 2, 'uc.monitoring': 2,
    'uc.impact_assessment': 3, 'uc.human_oversight': 3, 'uc.testing': 3, 'uc.logging': 3, 'uc.incident_process': 3, 'uc.go_live_approval': 3,
    'uc.independent_review': 4, 'uc.exec_accountability': 4, 'uc.continuous_monitoring': 4,
  };
  for (const [id, t] of Object.entries(expected)) assert.equal(tierMin(id), t, id);
});

test('ISO content: no requirement reproduces long ISO text (paraphrase only)', () => {
  // Guard against pasted standard text: no quotes, no "shall" in the library's own words.
  const text = JSON.stringify(LIB.requirements);
  assert.ok(!/\bshall\b/i.test(text), 'avoid normative ISO wording ("shall")');
});

// ---- resolved output ---------------------------------------------------------

function checkShape(r, where) {
  for (const q of r.requirements) {
    assert.deepEqual(
      Object.keys(q).filter(k => k !== 'existing' && k !== 'pack').sort(),
      ['artefact', 'effective_from', 'effort', 'gate', 'id', 'level', 'owners', 'sources', 'summary', 'title', 'why'],
      `${where} ${q.id}`,
    );
    assert.ok(q.effective_from === null || ISO_DATE.test(q.effective_from), `${where} ${q.id} date`);
    assert.ok(q.why.length > 0, `${where} ${q.id} why`);
    // Core requirements cite core frameworks; pack requirements cite their own pack's.
    const allowed = q.pack ? Object.keys(PACKS.find(p => p.id === q.pack).frameworks) : FRAMEWORKS;
    for (const s of q.sources) {
      assert.ok(allowed.includes(s.framework), `${where} ${q.id}: framework ${s.framework}`);
      assert.deepEqual(Object.keys(s).sort(), ['framework', 'ref', 'url']);
    }
    // EU sources only where the Act applies.
    if (r.status === 'out_of_scope') {
      assert.ok(q.sources.filter(s => s.framework === 'eu_ai_act').every(s => s.ref === 'Art. 2'), `${where} ${q.id}`);
    }
  }
  assert.ok(r.actions.length >= 1 && r.actions.length <= 5, `${where}: ${r.actions.length} actions`);
  const gateOf = id => r.requirements.find(q => q.id === id).gate;
  r.actions.forEach((a, i) => {
    assert.equal(a.rank, i + 1);
    assert.deepEqual(Object.keys(a).sort(), ['rank', 'requirement_id', 'title', 'why']);
    assert.ok(ids(r).includes(a.requirement_id), `${where}: action for missing ${a.requirement_id}`);
    if (i) assert.ok(GATES.indexOf(gateOf(a.requirement_id)) >= GATES.indexOf(gateOf(r.actions[i - 1].requirement_id)), `${where}: actions out of gate order`);
  });
  assert.equal(new Set(r.actions.map(a => a.requirement_id)).size, r.actions.length, `${where}: duplicate action`);
}

test('every golden scenario: valid shape, non-empty requirements, ≤5 gate-ordered actions', () => {
  for (const s of SUITE.scenarios) {
    const r = classify(base(s.answers));
    assert.ok(r.requirements.length > 0, s.id);
    checkShape(r, s.id);
    // Every EU obligation listed by the engine is covered by a returned requirement.
    const covered = new Set(LIB.requirements.filter(q => ids(r).includes(q.id)).flatMap(q => q.sources.map(x => x.obligation)));
    assert.deepEqual(r.obligations.filter(k => !covered.has(k)), [], `${s.id}: obligation without a requirement`);
  }
});

test('no answer combination yields an empty requirements list', () => {
  const field = id => MODEL.fields.find(f => f.id === id);
  let n = 0;
  for (const purpose of [...PURPOSES.purposes.map(p => p.id), 'unsure'])
    for (const eu_nexus of field('eu_nexus').values)
      for (const role of [['deploy_vendor'], ['build_own_use'], ['gpai_model_provider'], ['import_or_distribute'], []])
        for (const severity of field('severity').values)
          for (const autonomy of ['human_decides', 'autonomous'])
            for (const prohibited of [{}, { art_5_1a: 'unsure' }]) {
              const r = classify(base({ purpose, eu_nexus, role, severity, autonomy, prohibited }));
              n++;
              assert.ok(r.requirements.length > 0, JSON.stringify({ purpose, eu_nexus, role, severity }));
              assert.ok(r.actions.length > 0 && r.actions.length <= 5);
            }
  assert.ok(n > 5000, `only ${n} combinations`);
  assert.ok(classify({}).requirements.length > 0, 'empty answers');
});

test('actions: blocking open questions and the classification record come first', () => {
  const r = golden('G47');
  assert.ok(r.open_questions.some(q => q.blocking));
  assert.equal(r.actions[0].requirement_id, 'uc.classification_record');
  assert.match(r.actions[0].why, /^Blocking:/);
  assert.equal(r.actions[1].requirement_id, 'org.ai_inventory');
});

test('actions: dependency order for a high-risk provider/deployer (G09)', () => {
  const r = golden('G09');
  assert.deepEqual(r.actions.map(a => a.requirement_id),
    ['uc.classification_record', 'org.ai_inventory', 'uc.impact_assessment', 'uc.conformity', 'uc.incident_process']);
});

test('actions: a prohibited practice stops everything else', () => {
  const r = golden('G01');
  assert.equal(r.status, 'prohibited');
  assert.deepEqual(ids(r).sort(), ['uc.classification_record', 'uc.prohibited_stop']);
  assert.equal(r.actions[0].requirement_id, 'uc.prohibited_stop');
  assert.ok(cites(r, 'Art. 5(1)(f)'));
});

// ---- golden spot checks ---------------------------------------------------------

test('G09: credit scoring includes the FRIA and the provider high-risk set', () => {
  const r = golden('G09');
  const fria = r.requirements.find(q => q.sources.some(s => s.ref === 'Art. 27'));
  assert.ok(fria, 'FRIA requirement');
  assert.equal(fria.id, 'uc.impact_assessment');
  assert.match(fria.title, /Fundamental rights impact assessment/);
  assert.equal(fria.effective_from, '2027-12-02');
  for (const ref of ['Art. 9', 'Art. 10', 'Art. 12', 'Art. 14', 'Art. 15', 'Art. 17', 'Art. 26', 'Art. 72', 'Art. 73', 'Art. 86']) assert.ok(cites(r, ref), ref);
  assert.ok(!cites(r, 'Art. 49(3)'));
});

test('G10: fraud detection has no Art. 9 requirement but does get the tier-3 core', () => {
  const r = golden('G10');
  assert.equal(r.tier, 3);
  assert.ok(!cites(r, 'Art. 9'));
  assert.ok(!cites(r, 'Art. 27'));
  for (const id of ['uc.risk_assessment', 'uc.impact_assessment', 'uc.human_oversight', 'uc.testing', 'uc.logging', 'uc.incident_process', 'uc.go_live_approval']) {
    assert.ok(ids(r).includes(id), id);
  }
  const risk = r.requirements.find(q => q.id === 'uc.risk_assessment');
  assert.equal(risk.title, 'Risk assessment and treatment', 'no EU variant without the EU obligation');
  assert.equal(risk.effective_from, null);
  assert.ok(!ids(r).includes('uc.independent_review'), 'tier 4 only');
});

test('G33: out of EU scope still gets the tier requirements, with no EU citations', () => {
  const r = golden('G33');
  assert.equal(r.status, 'out_of_scope');
  for (const id of ['org.ai_inventory', 'uc.risk_assessment', 'uc.impact_assessment', 'uc.testing', 'uc.incident_process']) assert.ok(ids(r).includes(id), id);
  assert.ok(!cites(r, 'Art. 9') && !cites(r, 'Art. 4'));
  assert.ok(r.requirements.every(q => q.effective_from === null));
});

test('GenAI: the NIST AI 600-1 overlay appears only when llm_genai is tagged', () => {
  const on = classify(base({ purpose: 'content_generation', tech: ['llm_genai'] }));
  const off = classify(base({ purpose: 'content_generation', tech: ['classical_ml'] }));
  assert.ok(ids(on).includes('uc.genai_overlay'));
  assert.ok(!ids(off).includes('uc.genai_overlay'));
  assert.ok(on.requirements.find(q => q.id === 'uc.genai_overlay').sources.some(s => s.framework === 'nist_ai_600_1'));
});

test('tier 4 adds independent review, executive sign-off and continuous monitoring', () => {
  const r = classify(base({ purpose: 'credit_scoring', role: ['build_own_use'], severity: 'serious', autonomy: 'autonomous' }));
  assert.equal(r.tier, 4);
  for (const id of ['uc.independent_review', 'uc.exec_accountability', 'uc.continuous_monitoring']) assert.ok(ids(r).includes(id), id);
});

test('org items: flagged level org, and marked existing when a policy and inventory exist', () => {
  const yes = classify(base({ purpose: 'document_processing', ai_policy_inventory: 'yes' }));
  const no = classify(base({ purpose: 'document_processing', ai_policy_inventory: 'no' }));
  for (const id of ['org.ai_policy', 'org.ai_inventory']) {
    const y = yes.requirements.find(q => q.id === id);
    assert.equal(y.level, 'org');
    assert.equal(y.existing, true);
    assert.match(y.why, /^Existing: confirm/);
    assert.ok(no.requirements.find(q => q.id === id), `${id} kept when absent`);
    assert.equal(no.requirements.find(q => q.id === id).existing, undefined);
  }
  assert.equal(yes.requirements.find(q => q.id === 'org.ai_literacy').level, 'org');
});

test('a deployer of a vendor chatbot is not given the provider Art. 50(1) duty', () => {
  const r = classify(base({ purpose: 'customer_service_assistant', interaction: ['interacts_directly'] }));
  assert.ok(!cites(r, 'Art. 50(1)'));
  assert.ok(ids(r).includes('uc.vendor_due_diligence') || r.tier < 2);
});

test('Art. 6(3) derogation (provider) lists the documentation and registration item', () => {
  const r = classify(base({ purpose: 'recruitment_selection', art_6_3: { preparatory: 'yes' }, role: ['build_supply'] }));
  assert.equal(r.status, 'not_high_risk_6_3');
  const q = r.requirements.find(x => x.id === 'uc.art_6_3_record');
  assert.ok(q);
  assert.deepEqual(q.sources.filter(s => s.framework === 'eu_ai_act').map(s => s.ref), ['Art. 6(4)', 'Art. 49(2)']);
  assert.ok(r.actions.some(a => a.requirement_id === 'uc.art_6_3_record'));
});

test('action and requirement text never shows internal ids', () => {
  const raw = /annex_iii\.|annex_i\b|art_\d|eu\.art_|uc\.|org\.|prohibited\.\w|\w_\w/;
  for (const s of SUITE.scenarios) {
    const r = classify({ ...SUITE.defaults, ...s.answers }, { today: '2026-10-20' });
    for (const a of r.actions) assert.doesNotMatch(`${a.title} ${a.why}`, raw, `${s.id} action ${a.requirement_id}`);
    for (const q of r.requirements) assert.doesNotMatch(`${q.title} ${q.why}`, raw, `${s.id} requirement ${q.id}`);
  }
});

test('crosswalk: every ISO/IEC ref has a verified title and a public verification source', () => {
  for (const id of ['iso_42001', 'iso_23894', 'iso_42005']) {
    const fw = LIB.frameworks[id];
    assert.ok(fw.verified_against?.length, `${id}: verified_against`);
    for (const r of LIB.requirements) for (const s of r.sources) {
      if (s.framework === id) assert.ok(fw.ref_titles[s.ref], `${r.id}: ${id} ${s.ref} has no verified title`);
    }
  }
});

test('crosswalk: every ISO/IEC 42001 clause is confirmed against a published-edition source', () => {
  const fw = LIB.frameworks.iso_42001;
  const confirmed = new Set(fw.confirmed_published);
  for (const ref of confirmed) assert.ok(fw.ref_titles[ref], `confirmed_published lists unknown ref ${ref}`);
  const clauses = Object.keys(fw.ref_titles).filter(r => r.startsWith('Cl. ') && r !== 'Cl. 4-10');
  assert.deepEqual(clauses.filter(r => !confirmed.has(r)), []);
});
