/**
 * tier.js — governance tier (spec §6), driven entirely by tier-matrix.json
 *
 *   unsure defaults → severity modifiers → base matrix → escalators → floors; prohibited → 'P'
 *
 * tierInputs(answers)          → { severity, autonomy, reversible, open_questions }
 * tierStep(answers, status)    → { tier, open_questions, trace }
 */

import { TIERS } from './data.js';
import { because } from './answers.js';

const TIER_FIELDS = ['severity', 'autonomy', 'reversible'];

/** Answers after the unsure defaults (spec §6 step 1). Also used by the Art. 86 rule. */
export function tierInputs(answers) {
  const out = { open_questions: [] };
  for (const k of TIER_FIELDS) {
    const v = answers[k];
    if (v === undefined || v === 'unsure') {
      out[k] = TIERS.unsure_defaults[k];
      out.open_questions.push({ gate: k, field: k, assumption: `${k}=${out[k]} (tier only)`, blocking: false });
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function tierStep(answers, status) {
  const inputs = tierInputs(answers);
  const trace = [];
  const t = (rule, b) => trace.push({ step: 'tier', rule, because: b });

  if (status === 'prohibited') {
    t('Prohibited practice: tier P', [`status=${status}`]);
    return { tier: 'P', open_questions: inputs.open_questions, trace };
  }

  let { severity } = inputs;
  const { autonomy, reversible } = inputs;
  for (const m of TIERS.severity_modifiers) {
    if (m.if.severity === severity && m.if.reversible === reversible) {
      severity = m.set_severity;
      t(`${m.id}: severity raised to ${severity}`, [`severity=${inputs.severity}`, `reversible=${reversible}`]);
    }
  }
  let tier = TIERS.matrix[severity][autonomy];
  t(`Base tier ${tier} from matrix[${severity}][${autonomy}]`, [`severity=${severity}`, `autonomy=${autonomy}`]);

  for (const e of TIERS.escalators) {
    if (answers.affected.some(a => e.if_affected_any.includes(a))) {
      const next = Math.min(tier + e.add, e.max);
      if (next !== tier) t(`${e.id}: +${e.add} (max ${e.max})`, because(answers, 'affected'));
      tier = next;
    }
  }
  for (const f of TIERS.floors) {
    const hit = (f.if_status && f.if_status.includes(status)) ||
      (f.if_data_any && answers.data.some(x => f.if_data_any.includes(x)));
    if (hit && tier < f.min) {
      t(`${f.id}: floor ${f.min}`, f.if_status ? [`status=${status}`] : because(answers, 'data'));
      tier = f.min;
    }
  }
  return { tier, open_questions: inputs.open_questions, trace };
}
