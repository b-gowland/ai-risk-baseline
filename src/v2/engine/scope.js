/**
 * scope.js — Step 0: territorial and material scope (Art. 2), spec §3
 *
 * scopeStep(answers) → { scope: 'in' | 'out' | 'undetermined', out: boolean, foss: boolean,
 *                        open_questions, trace }
 *
 * The free and open-source exclusion (Art. 2(12)) depends on the final status, so it is
 * only flagged here; classify() applies it with applyFossExclusion() after step 5.
 */

import { because } from './answers.js';

const EXCLUDED = {
  military_defence_national_security: 'Art. 2(3)',
  scientific_research_only: 'Art. 2(6)',
  pre_market_research: 'Art. 2(8)',
  // Art. 2(10) strictly removes only the obligations of natural-person deployers; spec §3 treats it as out of scope.
  personal_non_professional: 'Art. 2(10)',
};

const FOSS_IN_SCOPE = ['prohibited', 'high_risk', 'transparency'];

export function scopeStep(answers) {
  const open_questions = [];
  const trace = [];
  const exclusion = answers.scope_exclusion;

  if (answers.eu_nexus === 'no') {
    trace.push({ step: 0, rule: 'Art. 2(1): no EU nexus, out of scope', because: because(answers, 'eu_nexus') });
    return { scope: 'out', out: true, foss: false, open_questions, trace };
  }
  if (EXCLUDED[exclusion]) {
    trace.push({
      step: 0,
      rule: `${EXCLUDED[exclusion]}: excluded from the Act, out of scope` +
        (exclusion === 'pre_market_research' ? ' (testing in real-world conditions is not covered)' : ''),
      because: because(answers, 'scope_exclusion'),
    });
    return { scope: 'out', out: true, foss: false, open_questions, trace };
  }

  let scope = 'in';
  if (answers.eu_nexus === 'unsure') {
    scope = 'undetermined';
    open_questions.push({ gate: 'eu_nexus', field: 'eu_nexus', assumption: 'Treat as in scope', blocking: false });
    trace.push({ step: 0, rule: 'Art. 2(1): EU nexus unknown, treated as in scope', because: because(answers, 'eu_nexus') });
  } else {
    trace.push({ step: 0, rule: 'Art. 2(1): EU nexus, in scope', because: because(answers, 'eu_nexus') });
  }
  if (exclusion === 'unsure') {
    scope = 'undetermined';
    open_questions.push({ gate: 'scope_exclusion', field: 'scope_exclusion', assumption: 'No exclusion applies: treat as in scope', blocking: false });
    trace.push({ step: 0, rule: 'Art. 2: exclusion unknown, treated as in scope', because: because(answers, 'scope_exclusion') });
  }
  const foss = exclusion === 'free_open_source';
  if (foss) {
    trace.push({ step: 0, rule: 'Art. 2(12): free and open-source exclusion depends on the final status (steps 1-5)', because: because(answers, 'scope_exclusion') });
  }
  return { scope, out: false, foss, open_questions, trace };
}

/**
 * Art. 2(12): open-source systems stay in scope only if prohibited, high-risk or subject to Art. 50.
 * A blocking prohibited-practice question means the exclusion cannot yet be relied on.
 */
export function applyFossExclusion(status, openQuestions) {
  if (FOSS_IN_SCOPE.includes(status)) {
    return { out: false, rule: `Art. 2(12): status ${status}, so the open-source exclusion does not apply` };
  }
  if (openQuestions.some(q => q.gate.startsWith('prohibited.'))) {
    return { out: false, undetermined: true, rule: 'Art. 2(12): open-source exclusion cannot be relied on while a prohibited-practice question is open' };
  }
  return { out: true, rule: `Art. 2(12): status ${status}, open-source exclusion applies, out of scope` };
}
