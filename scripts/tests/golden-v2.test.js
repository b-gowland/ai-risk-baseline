// Golden suite for the v2 classification spec (docs/v2/classification-spec.md).
//
// Today this checks that the spec data and the scenarios are internally consistent,
// and that every expected tier follows the published tier rules. Once
// src/v2/engine/classify.js exists, it also runs each scenario through the engine.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../../', import.meta.url);
const load = rel => JSON.parse(readFileSync(new URL(rel, root), 'utf8'));

const MODEL = load('src/v2/data/answer-model.json');
const PURPOSES = load('src/v2/data/purposes.json').purposes;
const PROHIBITED = load('src/v2/data/prohibited-practices.json').practices;
const OBLIGATIONS = load('src/v2/data/eu-obligations.json').obligations;
const TIERS = load('src/v2/data/tier-matrix.json');
const SUITE = load('src/v2/golden/scenarios.json');

const purposeById = new Map(PURPOSES.map(p => [p.id, p]));
const fieldById = new Map(MODEL.fields.map(f => [f.id, f]));
const obligationIds = new Set(OBLIGATIONS.map(o => o.id));

const STATUSES = ['prohibited', 'high_risk', 'not_high_risk_6_3', 'transparency', 'minimal', 'out_of_scope'];
const SCOPES = ['in', 'out', 'undetermined'];
const ROLES = ['provider', 'deployer', 'importer_distributor', 'gpai_provider'];
const GATES = ['eu_nexus', 'scope_exclusion', 'purpose', 'annex_i', 'annex_iii_condition', 'art_6_3', 'role', 'gpai_systemic', 'severity', 'autonomy', 'reversible',
  ...PROHIBITED.map(p => `prohibited.${p.id}`)];

// Predicate language from spec §2. Multi-select answers match on intersection.
export function matches(pred, answers) {
  if (!pred) return true;
  if (pred.all) return pred.all.every(p => matches(p, answers));
  if (pred.any) return pred.any.some(p => matches(p, answers));
  const [field, allowed] = Object.entries(pred)[0];
  const value = answers[field];
  if (value === undefined || value === null) return false;
  return Array.isArray(value) ? value.some(v => allowed.includes(v)) : allowed.includes(value);
}

const shownPractices = answers => PROHIBITED.filter(p => matches(p.show_when, answers));

function allowedValues(field) {
  if (field.values_from === 'purposes') return [...purposeById.keys(), ...(field.extra_values || [])];
  return field.values;
}

function validateAnswers(answers) {
  const errors = [];
  for (const [key, value] of Object.entries(answers)) {
    const field = fieldById.get(key);
    if (!field) { errors.push(`unknown field ${key}`); continue; }
    if (field.type === 'map') {
      const keys = field.keys_from === 'prohibited_practices' ? PROHIBITED.map(p => p.id) : field.keys;
      for (const [k, v] of Object.entries(value)) {
        if (!keys.includes(k)) errors.push(`${key}: unknown key ${k}`);
        if (!field.values.includes(v)) errors.push(`${key}.${k}: invalid value ${v}`);
      }
    } else if (field.type === 'multi') {
      if (!Array.isArray(value)) errors.push(`${key}: expected array`);
      else value.filter(v => !field.values.includes(v)).forEach(v => errors.push(`${key}: invalid value ${v}`));
    } else if (!allowedValues(field).includes(value)) {
      errors.push(`${key}: invalid value ${value}`);
    }
  }
  if (!answers.purpose) errors.push('purpose is required');
  for (const [id, v] of Object.entries(answers.prohibited || {})) {
    if (v !== 'no' && !shownPractices(answers).some(p => p.id === id)) {
      errors.push(`prohibited.${id} answered '${v}' but the item is not shown for these answers`);
    }
  }
  return errors;
}

// Spec §6, driven entirely by tier-matrix.json.
export function referenceTier(answers, status) {
  if (status === 'prohibited') return 'P';
  const d = TIERS.unsure_defaults;
  const pick = (k) => (answers[k] === undefined || answers[k] === 'unsure') ? d[k] : answers[k];
  let severity = pick('severity');
  const autonomy = pick('autonomy');
  const reversible = pick('reversible');
  for (const m of TIERS.severity_modifiers) {
    if (m.if.severity === severity && m.if.reversible === reversible) severity = m.set_severity;
  }
  let tier = TIERS.matrix[severity][autonomy];
  for (const e of TIERS.escalators) {
    if ((answers.affected || []).some(a => e.if_affected_any.includes(a))) tier = Math.min(tier + e.add, e.max);
  }
  for (const f of TIERS.floors) {
    const hit = (f.if_status && f.if_status.includes(status)) ||
      (f.if_data_any && (answers.data || []).some(x => f.if_data_any.includes(x)));
    if (hit) tier = Math.max(tier, f.min);
  }
  return tier;
}

const merged = s => ({ ...SUITE.defaults, ...s.answers });

// Answers that, when 'unsure', change the legal result (spec §4). Tier-only fields are excluded.
function statusAffectingUnsure(answers) {
  const out = [];
  for (const k of ['purpose', 'eu_nexus', 'scope_exclusion', 'org_type', 'annex_i_product']) {
    if (answers[k] === 'unsure') out.push(k);
  }
  if ((answers.role || []).includes('unsure')) out.push('role');
  for (const [k, v] of Object.entries(answers.art_6_3 || {})) if (v === 'unsure') out.push(`art_6_3.${k}`);
  for (const [k, v] of Object.entries(answers.prohibited || {})) if (v === 'unsure') out.push(`prohibited.${k}`);
  return out;
}

test('spec data: ids are unique and cross-references resolve', () => {
  const dupes = arr => arr.filter((x, i) => arr.indexOf(x) !== i);
  assert.deepEqual(dupes(PURPOSES.map(p => p.id)), []);
  assert.deepEqual(dupes(PROHIBITED.map(p => p.id)), []);
  assert.deepEqual(dupes(OBLIGATIONS.map(o => o.id)), []);
  assert.deepEqual(dupes(SUITE.scenarios.map(s => s.id)), []);
  for (const p of PROHIBITED) assert.ok(obligationIds.has(`eu.${p.id}`), `no obligation key for ${p.id}`);
  for (const o of OBLIGATIONS) {
    assert.ok(o.role.every(r => ROLES.includes(r)), `${o.id}: unknown role`);
  }
});

test('spec data: every predicate value exists in the answer model', () => {
  const check = (pred, where) => {
    if (!pred) return;
    if (pred.all || pred.any) return (pred.all || pred.any).forEach(p => check(p, where));
    const [field, values] = Object.entries(pred)[0];
    if (field === 'annex_iii_matched') return;
    const def = fieldById.get(field);
    assert.ok(def, `${where}: unknown field ${field}`);
    const allowed = allowedValues(def);
    for (const v of values) assert.ok(allowed.includes(v), `${where}: ${field}=${v} is not a valid value`);
  };
  PROHIBITED.forEach(p => check(p.show_when, p.id));
  PURPOSES.forEach(p => check(p.annex_iii_condition, p.id));
  MODEL.fields.forEach(f => check(f.show_when, `field ${f.id}`));
});

test('spec data: tier matrix covers every severity and autonomy value', () => {
  const sev = fieldById.get('severity').values.filter(v => v !== 'unsure');
  const aut = fieldById.get('autonomy').values.filter(v => v !== 'unsure');
  for (const s of sev) for (const a of aut) {
    assert.ok([1, 2, 3, 4].includes(TIERS.matrix[s]?.[a]), `matrix missing ${s}/${a}`);
  }
});

for (const s of SUITE.scenarios) {
  test(`golden ${s.id}: ${s.title}`, () => {
    const answers = merged(s);
    const e = s.expect;

    assert.deepEqual(validateAnswers(answers), [], 'answers must be valid');
    assert.ok(s.basis_refs?.length, 'cite at least one basis_ref');

    assert.ok(SCOPES.includes(e.scope), `bad scope ${e.scope}`);
    assert.ok(STATUSES.includes(e.status), `bad status ${e.status}`);
    assert.equal(typeof e.provisional, 'boolean');
    (e.roles || []).forEach(r => assert.ok(ROLES.includes(r), `bad role ${r}`));
    (e.open_questions || []).forEach(g => assert.ok(GATES.includes(g), `bad gate ${g}`));
    [...(e.must_include || []), ...(e.must_exclude || [])].forEach(k => assert.ok(obligationIds.has(k), `unknown obligation ${k}`));
    const overlap = (e.must_include || []).filter(k => (e.must_exclude || []).includes(k));
    assert.deepEqual(overlap, [], 'must_include and must_exclude overlap');

    // Status and basis must agree with the answers.
    if (e.status === 'prohibited') {
      assert.equal(answers.prohibited[e.basis], 'yes', 'prohibited basis must be answered yes');
      assert.ok(e.must_include.includes(`eu.${e.basis}`));
    } else {
      assert.ok(!Object.values(answers.prohibited).includes('yes'), 'a yes on the Art. 5 screen must give status prohibited');
    }
    if (typeof e.basis === 'string' && e.basis.startsWith('annex_iii.')) {
      assert.equal(e.basis, `annex_iii.${purposeById.get(answers.purpose)?.annex_iii}`, 'Annex III basis must come from the purpose');
    }
    if (e.status === 'out_of_scope') assert.equal(e.scope, 'out');
    if (!e.provisional) {
      assert.deepEqual(statusAffectingUnsure(answers), [], 'non-provisional scenarios must not rely on unsure answers');
    } else {
      assert.ok(statusAffectingUnsure(answers).length > 0, 'provisional scenarios need at least one unsure answer');
    }

    assert.equal(e.tier, referenceTier(answers, e.status), 'expected tier must follow tier-matrix.json');
  });
}

const enginePath = fileURLToPath(new URL('src/v2/engine/classify.js', root));
const engineReady = existsSync(enginePath);

test('golden suite against the v2 engine', { skip: engineReady ? false : 'src/v2/engine/classify.js not implemented yet (Phase 2)' }, async () => {
  const { classify } = await import(pathToFileURL(enginePath).href);
  const failures = [];
  for (const s of SUITE.scenarios) {
    const r = classify(merged(s));
    const e = s.expect;
    const fail = msg => failures.push(`${s.id} ${msg}`);
    if (r.scope !== e.scope) fail(`scope ${r.scope} != ${e.scope}`);
    if (r.status !== e.status) fail(`status ${r.status} != ${e.status}`);
    if ('basis' in e && r.basis !== e.basis) fail(`basis ${r.basis} != ${e.basis}`);
    if (r.provisional !== e.provisional) fail(`provisional ${r.provisional} != ${e.provisional}`);
    if (e.roles && [...r.roles].sort().join() !== [...e.roles].sort().join()) fail(`roles ${r.roles} != ${e.roles}`);
    if (r.tier !== e.tier) fail(`tier ${r.tier} != ${e.tier}`);
    const gates = new Set((r.open_questions || []).map(q => q.gate));
    (e.open_questions || []).filter(g => !gates.has(g)).forEach(g => fail(`missing open question ${g}`));
    (e.must_include || []).filter(k => !r.obligations.includes(k)).forEach(k => fail(`missing ${k}`));
    (e.must_exclude || []).filter(k => r.obligations.includes(k)).forEach(k => fail(`unexpected ${k}`));
  }
  assert.deepEqual(failures, []);
});
