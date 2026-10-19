/**
 * classify.js — v2 EU AI Act classification engine
 *
 * classify(answers, options) → {
 *   scope, status, basis, bases, provisional, roles, obligations, effective_from,
 *   tier, open_questions: [{ gate, field, assumption, blocking }],
 *   trace: [{ step, rule, because }], notes: [{ ref, text }]
 * }
 *
 * Implements docs/v2/classification-spec.md §3-§6. Steps run in order:
 *   0 scope · 1 prohibited · 2 Annex I · 3 Annex III · 4 Art. 6(3) · 5 Art. 50 · 6 roles
 * then obligations (§5) and the governance tier (§6). Pure and deterministic:
 * options.today (ISO date, default today) only affects dated notes.
 *
 * Spec §3 lists the keys up to trace; bases, effective_from and notes are additions
 * for the UI.
 */

import { normalize, because } from './answers.js';
import { scopeStep, applyFossExclusion } from './scope.js';
import { prohibitedStep } from './prohibited.js';
import { annexIStep, annexIIIStep, art63Step } from './annex.js';
import { transparencyStep } from './transparency.js';
import { rolesStep } from './roles.js';
import { obligationsStep } from './obligations.js';
import { tierStep, tierInputs } from './tier.js';

// Open questions that only feed the tier, or that never change the status.
const NON_PROVISIONAL_GATES = ['severity', 'autonomy', 'reversible', 'gpai_systemic'];

export function classify(rawAnswers, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const answers = normalize(rawAnswers);
  const open_questions = [];
  const trace = [];
  const notes = [];
  const collect = r => {
    open_questions.push(...(r.open_questions || []));
    trace.push(...(r.trace || []));
    notes.push(...(r.notes || []));
    return r;
  };

  // Step 0
  const scopeResult = collect(scopeStep(answers));
  let scope = scopeResult.scope;
  if (scopeResult.out) return outOfScope(answers, { open_questions, trace, notes });

  // Step 1
  const prohibited = collect(prohibitedStep(answers, today)).prohibited;

  // Steps 2-4
  const annexI = collect(annexIStep(answers));
  const annexIII = collect(annexIIIStep(answers));
  let derogation = false;
  if (annexIII.matched) {
    const providerDecides = !answers.role.every(r => r === 'deploy_vendor');
    const art63 = collect(art63Step(answers, providerDecides));
    derogation = art63.derogation;
  } else {
    trace.push({ step: 4, rule: 'Art. 6(3): not an Annex III candidate, step skipped', because: because(answers, 'purpose') });
  }

  // Step 5
  const transparency = collect(transparencyStep(answers));

  // Status
  let status;
  let basis = null;
  const bases = [];
  if (annexI.applies) bases.push('annex_i');
  if (annexIII.matched && annexIII.ref) bases.push(`annex_iii.${annexIII.ref}`);
  if (prohibited.length) {
    status = 'prohibited';
    basis = prohibited[0].id;
  } else if (annexI.applies || (annexIII.matched && !derogation)) {
    status = 'high_risk';
    basis = bases[0] || null;
  } else if (annexIII.matched) {
    status = 'not_high_risk_6_3';
    basis = bases[0] || null;
  } else if (transparency.triggers.length) {
    status = 'transparency';
  } else {
    status = 'minimal';
  }
  if (annexI.applies && annexIII.matched) {
    trace.push({ step: 3, rule: 'Annex I and Annex III both match: both bases kept, Annex I governs the dates', because: because(answers, 'purpose', 'annex_i_product') });
  }
  trace.push({ step: 'status', rule: `Status ${status}${basis ? ` (${basis})` : ''}`, because: [`basis=${basis}`] });

  // Art. 2(12) open-source exclusion, decided on the status
  if (scopeResult.foss) {
    const foss = applyFossExclusion(status, open_questions);
    trace.push({ step: 0, rule: foss.rule, because: [`scope_exclusion=free_open_source`, `status=${status}`] });
    if (foss.out) return outOfScope(answers, { open_questions, trace, notes });
    if (foss.undetermined) scope = 'undetermined';
  }

  // Step 6
  const roles = collect(rolesStep(answers, status)).roles;

  // Obligations (§5)
  const obl = collect(obligationsStep({
    answers, status, roles, prohibited, triggers: transparency.triggers,
    annexI: annexI.applies,
    annexIII: { matched: annexIII.matched, ref: annexIII.ref },
    severity: tierInputs(answers).severity,
  }));

  // Tier (§6)
  const tier = collect(tierStep(answers, status)).tier;

  const questions = dedupe(open_questions);
  return {
    scope,
    status,
    basis,
    bases,
    provisional: questions.some(q => !NON_PROVISIONAL_GATES.includes(q.gate)),
    roles,
    obligations: obl.obligations,
    effective_from: obl.effective_from,
    tier,
    open_questions: questions,
    trace,
    notes: dedupeNotes(notes),
  };
}

// Out of scope: the tier (and the core ISO/NIST baseline) is still produced; legal questions are moot.
function outOfScope(answers, { trace, notes }) {
  const tier = tierStep(answers, 'out_of_scope');
  trace.push({ step: 6, rule: 'Out of scope: no EU AI Act role applies', because: because(answers, 'role') });
  trace.push(...tier.trace);
  const questions = dedupe(tier.open_questions);
  return {
    scope: 'out',
    status: 'out_of_scope',
    basis: null,
    bases: [],
    provisional: false,
    roles: [],
    obligations: [],
    effective_from: {},
    tier: tier.tier,
    open_questions: questions,
    trace,
    notes: dedupeNotes(notes),
  };
}

function dedupe(questions) {
  const seen = new Set();
  // An org_type question raised by the obligation rules is redundant when step 3 already asked it.
  const conditionFields = new Set(questions.filter(q => q.gate === 'annex_iii_condition').map(q => q.field));
  return questions.filter(q => {
    if (q.gate === 'org_type' && conditionFields.has('org_type')) return false;
    const k = `${q.gate}|${q.field}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function dedupeNotes(notes) {
  const seen = new Set();
  return notes.filter(n => !seen.has(n.text) && seen.add(n.text));
}
