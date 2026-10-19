/**
 * answers.js — fill in unanswered fields (spec §2, "Unanswered fields")
 *
 *   prohibited.* and art_6_3.*  → missing keys read as 'no' (maps stay sparse)
 *   interaction and other multi-selects without an 'unsure' value → []
 *   role (multi-select with 'unsure') → ['unsure'] when empty
 *   every other unanswered field → 'unsure' (if the field allows it)
 */

import { FIELDS } from './data.js';

const allowsUnsure = f => (f.values || []).includes('unsure') || (f.extra_values || []).includes('unsure');

export function normalize(raw = {}) {
  const answers = { ...raw };
  for (const f of FIELDS) {
    const v = answers[f.id];
    if (f.type === 'map') {
      answers[f.id] = { ...(v || {}) };
    } else if (f.type === 'multi') {
      if (!Array.isArray(v) || v.length === 0) answers[f.id] = allowsUnsure(f) ? ['unsure'] : [];
    } else if ((v === undefined || v === null || v === '') && allowsUnsure(f)) {
      answers[f.id] = 'unsure';
    }
  }
  return answers;
}

/** Read a map answer (prohibited, art_6_3) with the spec default of 'no'. */
export function mapAnswer(answers, field, key) {
  return (answers[field] || {})[key] || 'no';
}

/** "field=value" strings for trace entries. */
export function because(answers, ...fields) {
  return fields.map(f => {
    if (f.includes('.')) {
      const [field, key] = f.split('.');
      return `${f}=${mapAnswer(answers, field, key)}`;
    }
    const v = answers[f];
    return `${f}=${Array.isArray(v) ? `[${v.join(', ')}]` : v}`;
  });
}
