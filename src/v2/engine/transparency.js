/**
 * transparency.js — Step 5: Art. 50 triggers, spec §3
 *
 * transparencyStep(answers) → { triggers: [{ key, because }], trace, notes }
 *
 * The triggers describe the system. Which of them the user holds is decided from the
 * obligation's role in eu-obligations.json (see obligations.js).
 */

import { because } from './answers.js';

const BY_INTERACTION = {
  interacts_directly: 'eu.art_50_1',
  generates_synthetic_content: 'eu.art_50_2',
  emotion_or_biometric_categorisation: 'eu.art_50_3',
  deepfake: 'eu.art_50_4',
  public_interest_text: 'eu.art_50_4',
};
const BY_PURPOSE = {
  emotion_recognition: 'eu.art_50_3',
  biometric_categorisation: 'eu.art_50_3',
};

export function transparencyStep(answers) {
  const found = new Map();
  const add = (key, why) => found.set(key, [...(found.get(key) || []), why]);
  for (const v of answers.interaction) if (BY_INTERACTION[v]) add(BY_INTERACTION[v], `interaction includes ${v}`);
  if (BY_PURPOSE[answers.purpose]) add(BY_PURPOSE[answers.purpose], `purpose=${answers.purpose}`);

  const triggers = [...found].map(([key, why]) => ({ key, because: why }));
  const trace = triggers.length
    ? triggers.map(t => ({ step: 5, rule: `${t.key.replace('eu.art_50_', 'Art. 50(')}): transparency trigger`, because: t.because }))
    : [{ step: 5, rule: 'Art. 50: no transparency trigger', because: because(answers, 'interaction') }];

  const notes = [];
  const keys = triggers.map(t => t.key);
  if (keys.includes('eu.art_50_2')) {
    notes.push({ ref: 'Art. 50(2)', text: 'Does not apply to assistive editing that does not substantially alter the input. Systems placed on the market before 2 Aug 2026 must comply by 2 Dec 2026 (Art. 111(4)).' });
  }
  if (keys.includes('eu.art_50_4')) {
    notes.push({ ref: 'Art. 50(4)', text: 'Evidently artistic, creative, satirical or fictional works need only an unobtrusive disclosure. Public-interest text is caught only where no person holds editorial responsibility.' });
  }
  if (triggers.length) {
    notes.push({ ref: 'Art. 50', text: 'Uses authorised by law to detect, prevent, investigate or prosecute criminal offences are exempt.' });
  }
  return { triggers, trace, notes };
}
