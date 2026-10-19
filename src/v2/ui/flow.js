/**
 * flow.js — which questions and gates the v2 questionnaire shows (pure functions).
 *
 * Visibility follows answer-model.json show_when (spec §2). 'annex_iii_matched' is computed
 * with the engine's own Step 3, so the questionnaire and the classification never disagree.
 * The prohibited screen shows only the practices whose show_when matches; some depend on
 * later answers (tech, interaction, affected, org_type), so the review gate picks up any
 * practice that became relevant after the screen.
 */

import MODEL from '../data/answer-model.json' with { type: 'json' };
import { normalize } from '../engine/answers.js';
import { matches } from '../engine/predicate.js';
import { annexIIIStep } from '../engine/annex.js';
import { shownPractices } from '../engine/prohibited.js';
import { GATES } from './labels.js';

export const FIELD_BY_ID = new Map(MODEL.fields.map(f => [f.id, f]));

export const allowsUnsure = f => (f.values || []).includes('unsure') || (f.extra_values || []).includes('unsure');

/** Multi-selects with no 'unsure' value: an empty list is a valid answer ("none of these"). */
export const isOptional = f => f.type === 'multi' && !allowsUnsure(f);

export function annexIIIMatched(answers) {
  if (!answers.purpose) return false;
  return annexIIIStep(normalize(answers)).matched;
}

export function isFieldVisible(fieldId, answers) {
  const f = FIELD_BY_ID.get(fieldId);
  if (!f) return false;
  return matches(f.show_when, answers, { annexIIIMatched: annexIIIMatched(answers) });
}

export function visiblePractices(answers) {
  if (!answers.purpose) return [];
  return shownPractices(normalize(answers));
}

export function visibleGates(answers) {
  return GATES.filter(g =>
    g.id === 'prohibited' || g.id === 'review' || g.fields.some(id => isFieldVisible(id, answers)));
}

export function isAnswered(fieldId, answers) {
  const f = FIELD_BY_ID.get(fieldId);
  const v = answers[fieldId];
  if (fieldId === 'prohibited') return visiblePractices(answers).every(p => (v || {})[p.id]);
  if (f.type === 'map') return f.keys.every(k => (v || {})[k]);
  if (f.type === 'multi') return Array.isArray(v) && (isOptional(f) || v.length > 0);
  return v !== undefined && v !== null && v !== '';
}

/** Visible, required questions in a gate that still need an answer. */
export function missingInGate(gate, answers) {
  return gate.fields.filter(id => {
    const f = FIELD_BY_ID.get(id);
    if (!isFieldVisible(id, answers) || isOptional(f)) return false;
    return !isAnswered(id, answers);
  });
}

/** Practices now shown but not answered (e.g. made relevant by a later answer). */
export function unansweredPractices(answers) {
  return visiblePractices(answers).filter(p => !(answers.prohibited || {})[p.id]);
}

export function isComplete(answers) {
  return visibleGates(answers).every(g => missingInGate(g, answers).length === 0) &&
    unansweredPractices(answers).length === 0;
}

/**
 * Drop answers to questions that are no longer shown (e.g. after the purpose changed), so
 * the shared URL only carries what the user saw.
 */
export function pruneHidden(answers) {
  const out = {};
  for (const f of MODEL.fields) {
    if (answers[f.id] === undefined) continue;
    if (!isFieldVisible(f.id, answers)) continue;
    out[f.id] = answers[f.id];
  }
  if (out.prohibited) {
    const shown = new Set(visiblePractices(answers).map(p => p.id));
    const kept = Object.fromEntries(Object.entries(out.prohibited).filter(([k]) => shown.has(k)));
    if (Object.keys(kept).length) out.prohibited = kept;
    else delete out.prohibited;
  }
  return out;
}

/** Toggle a value in a multi-select, keeping 'unsure' (and 'none') exclusive. */
export function toggleMulti(current, value) {
  const list = Array.isArray(current) ? current : [];
  const exclusive = ['unsure', 'none'];
  if (list.includes(value)) return list.filter(v => v !== value);
  if (exclusive.includes(value)) return [value];
  return [...list.filter(v => !exclusive.includes(v)), value];
}
