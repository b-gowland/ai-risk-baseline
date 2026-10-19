/**
 * prohibited.js — Step 1: prohibited practices (Art. 5), spec §3
 *
 * prohibitedStep(answers) → { prohibited: [practice], open_questions, trace, notes }
 *
 * Only items whose show_when matches are screened; unanswered shown items read as 'no'.
 */

import { PRACTICES } from './data.js';
import { matches } from './predicate.js';
import { mapAnswer, because } from './answers.js';

const PROVIDER_DEPLOYER_SPLIT = ['art_5_1ba', 'art_5_1bb'];

export function shownPractices(answers) {
  return PRACTICES.filter(p => matches(p.show_when, answers));
}

export function prohibitedStep(answers, today) {
  const shown = shownPractices(answers);
  const yes = shown.filter(p => mapAnswer(answers, 'prohibited', p.id) === 'yes');
  const unsure = shown.filter(p => mapAnswer(answers, 'prohibited', p.id) === 'unsure');
  const open_questions = [];
  const trace = [];
  const notes = [];

  trace.push({ step: 1, rule: `Art. 5 screen: ${shown.length} item(s) shown (${shown.map(p => p.id).join(', ') || 'none'})`, because: because(answers, 'purpose') });

  for (const p of yes) {
    trace.push({ step: 1, rule: `${p.citation}: prohibited practice`, because: because(answers, `prohibited.${p.id}`) });
  }
  for (const p of yes.length ? [] : unsure) {
    open_questions.push({
      gate: `prohibited.${p.id}`,
      field: `prohibited.${p.id}`,
      assumption: 'Treat as potentially prohibited: do not deploy until resolved',
      blocking: true,
    });
    trace.push({ step: 1, rule: `${p.citation}: unresolved, treated as potentially prohibited`, because: because(answers, `prohibited.${p.id}`) });
  }
  for (const p of [...yes, ...(yes.length ? [] : unsure)]) {
    if (p.effective_from > today) {
      notes.push({ ref: p.citation, text: `Still classified as prohibited: this prohibition applies from ${p.effective_from}.` });
    }
    if (PROVIDER_DEPLOYER_SPLIT.includes(p.id)) {
      notes.push({ ref: 'Art. 5(1a)', text: 'A provider is caught if the output is the intended purpose or a reasonably foreseeable and reproducible outcome without adequate safeguards; a deployer only if they use the system for that purpose.' });
    }
  }
  return { prohibited: yes, open_questions, trace, notes };
}
