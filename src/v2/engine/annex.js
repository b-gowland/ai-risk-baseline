/**
 * annex.js — Steps 2-4: Annex I product route (Art. 6(1)), Annex III (Art. 6(2))
 * and the Art. 6(3) derogation. Spec §3.
 *
 * annexIStep(answers)          → { applies, provisional, open_questions, trace, notes }
 * annexIIIStep(answers)        → { matched, ref, provisional, open_questions, trace }
 * art63Step(answers, roles)    → { derogation, provisional, open_questions, trace }
 *
 * ref is the Annex III point (e.g. '5(b)'), or null when the purpose is unsure and the
 * point is unknown.
 */

import { FIELD_BY_ID, PURPOSE_BY_ID } from './data.js';
import { matches, evaluate } from './predicate.js';
import { mapAnswer, because } from './answers.js';

const ART_6_3 = FIELD_BY_ID.get('art_6_3');
const CONDITIONS = ART_6_3.keys.filter(k => k !== 'profiling');

export function annexIStep(answers) {
  const field = FIELD_BY_ID.get('annex_i_product');
  const open_questions = [];
  const trace = [];
  const notes = [];
  if (!matches(field.show_when, answers)) {
    trace.push({ step: 2, rule: 'Art. 6(1): Annex I question not shown for this purpose', because: because(answers, 'purpose') });
    return { applies: false, provisional: false, open_questions, trace, notes };
  }
  const value = answers.annex_i_product;
  if (value === 'no') {
    trace.push({ step: 2, rule: 'Art. 6(1), Art. 3(14): not a safety component of an Annex I product', because: because(answers, 'annex_i_product') });
    return { applies: false, provisional: false, open_questions, trace, notes };
  }
  const provisional = value !== 'yes';
  if (provisional) {
    open_questions.push({ gate: 'annex_i', field: 'annex_i_product', assumption: 'High-risk via Annex I', blocking: false });
  }
  trace.push({
    step: 2,
    rule: provisional ? 'Art. 6(1): Annex I product status unknown, treated as high-risk via Annex I' : 'Art. 6(1): safety component of an Annex I product, high-risk',
    because: because(answers, 'annex_i_product'),
  });
  notes.push({ ref: 'Art. 2(13)', text: 'Delegated acts may limit some Art. 9-15 and 17-25 obligations where Annex I Section A legislation already gives equivalent protection.' });
  notes.push({ ref: 'Art. 2(2)', text: 'Annex I Section B products (vehicles, aviation, marine, rail, machinery) are covered only through their sectoral acts; v2 does not classify them as high-risk.' });
  return { applies: true, provisional, open_questions, trace, notes };
}

export function annexIIIStep(answers) {
  const open_questions = [];
  const trace = [];
  if (answers.purpose === 'unsure') {
    open_questions.push({ gate: 'purpose', field: 'purpose', assumption: 'High-risk (Annex III, basis unknown)', blocking: true });
    trace.push({ step: 3, rule: 'Art. 6(2): purpose unknown, treated as an Annex III high-risk candidate', because: because(answers, 'purpose') });
    return { matched: true, ref: null, provisional: true, open_questions, trace };
  }
  const purpose = PURPOSE_BY_ID.get(answers.purpose);
  if (!purpose || !purpose.annex_iii) {
    trace.push({ step: 3, rule: 'Art. 6(2): purpose is not listed in Annex III', because: because(answers, 'purpose') });
    return { matched: false, ref: null, provisional: false, open_questions, trace };
  }
  const { result, unsure } = evaluate(purpose.annex_iii_condition, answers);
  const condFields = Object.keys(purpose.annex_iii_condition ? flatLeaves(purpose.annex_iii_condition) : {});
  if (result === false) {
    trace.push({ step: 3, rule: `Annex III ${purpose.annex_iii}: condition not met`, because: because(answers, 'purpose', ...condFields) });
    return { matched: false, ref: null, provisional: false, open_questions, trace };
  }
  const provisional = result === 'unsure';
  for (const f of unsure) {
    open_questions.push({ gate: 'annex_iii_condition', field: f, assumption: `Condition met: Annex III ${purpose.annex_iii} applies`, blocking: false });
  }
  trace.push({
    step: 3,
    rule: `Annex III ${purpose.annex_iii}: high-risk candidate${provisional ? ' (condition unknown, treated as met)' : ''}`,
    because: because(answers, 'purpose', ...condFields),
  });
  return { matched: true, ref: purpose.annex_iii, provisional, open_questions, trace };
}

function flatLeaves(pred, out = {}) {
  if (pred.all || pred.any) (pred.all || pred.any).forEach(p => flatLeaves(p, out));
  else Object.assign(out, pred);
  return out;
}

export function art63Step(answers, providerDecides = true) {
  const open_questions = [];
  const trace = [];
  const a = k => mapAnswer(answers, 'art_6_3', k);
  const yes = CONDITIONS.filter(k => a(k) === 'yes');
  const unsure = CONDITIONS.filter(k => a(k) === 'unsure');
  const result = (derogation, provisional, rule, keys) => {
    if (provisional) {
      open_questions.push({ gate: 'art_6_3', field: keys.map(k => `art_6_3.${k}`).join(', '), assumption: 'Derogation not available: high-risk', blocking: false });
    }
    trace.push({ step: 4, rule, because: because(answers, ...keys.map(k => `art_6_3.${k}`)) });
    if (derogation && !providerDecides) {
      trace.push({ step: 4, rule: 'Art. 6(4): the derogation is the provider\'s assessment; obtain the documented assessment from your vendor', because: because(answers, 'role') });
    }
    return { derogation, provisional, open_questions, trace };
  };

  if (a('profiling') === 'yes') {
    return result(false, false, 'Art. 6(3) last subparagraph: the system profiles natural persons, so the derogation is unavailable', ['profiling']);
  }
  if (a('profiling') === 'unsure') {
    return result(false, true, 'Art. 6(3): profiling unknown, derogation treated as unavailable', ['profiling', ...unsure]);
  }
  if (yes.length) {
    return result(true, false, `Art. 6(3): derogation applies (${yes.join(', ')}), not high-risk`, ['profiling', ...yes]);
  }
  if (unsure.length) {
    return result(false, true, 'Art. 6(3): derogation conditions unknown, treated as unavailable', ['profiling', ...unsure]);
  }
  return result(false, false, 'Art. 6(3): no derogation condition met, high-risk', ['profiling']);
}
