/**
 * actions.js — first 5 actions (spec §10.4)
 *
 * actionsStep(answers, result, requirements) → [{ rank, requirement_id, title, why }] (≤ 5)
 *
 * Ordered by gate and dependency, never by effort. One slot per stage, each filled by the
 * first applicable requirement in its preference list:
 *   1 classify   blocking open questions + classification record (prohibited: stop first)
 *   2 inventory  AI inventory entry
 *   3 assess     impact assessment, else risk assessment, else owner + acceptable use
 *   4 go-live    the item that blocks go-live
 *   5 operate    incidents, else monitoring
 * The picks are then stably sorted by gate, so the list never goes backwards in the lifecycle.
 */

import { GATES } from './requirements.js';

const MAX = 5;

const ASSESS = ['uc.impact_assessment', 'uc.risk_assessment', 'uc.owner'];
const GO_LIVE = [
  'uc.conformity', 'uc.art_6_3_record', 'uc.gpai_model', 'uc.importer_distributor', 'uc.deployer_duties',
  'uc.go_live_approval', 'uc.content_marking', 'uc.transparency', 'uc.vendor_due_diligence', 'org.ai_literacy',
];
const OPERATE = ['uc.incident_process', 'uc.monitoring', 'org.ai_literacy'];

const TITLES = {
  'uc.prohibited_stop': 'Stop the use case and escalate to Legal',
  'org.ai_inventory': 'Add the use case to the AI inventory',
  'uc.owner': 'Name the business owner and confirm acceptable use',
};

export function actionsStep(answers, result, requirements) {
  const byId = new Map(requirements.map(r => [r.id, r]));
  const picked = [];
  const take = (id, title, why) => {
    const r = byId.get(id);
    if (!r || picked.some(p => p.requirement_id === id)) return false;
    picked.push({ requirement_id: id, title: title || TITLES[id] || r.title, why: why || r.why, gate: r.gate });
    return true;
  };
  const first = (ids, why) => ids.some(id => take(id, null, why?.(byId.get(id))));

  const blocking = result.open_questions.filter(q => q.blocking);

  if (result.status === 'prohibited') {
    take('uc.prohibited_stop', null, `Art. 5 applies: ${result.basis}. Nothing else should be built on this use case.`);
    take('uc.classification_record', 'Record the prohibited-practice finding', 'Keep the trace and the legal sign-off with the decision to stop.');
    return rank(picked);
  }

  if (blocking.length) {
    take('uc.classification_record', 'Resolve the blocking open questions and record the classification',
      `Blocking: ${blocking.map(q => `${q.gate} (assumed: ${q.assumption})`).join('; ')}. Resolve before go-live.`);
  } else {
    take('uc.classification_record', 'Record the classification', classificationWhy(result));
  }
  take('org.ai_inventory', answers.ai_policy_inventory === 'yes' ? 'Add the use case to your existing AI inventory' : null);
  first(ASSESS);
  first(GO_LIVE, r => r && `Blocks go-live. ${r.why}`);
  first(OPERATE);
  return rank(picked);
}

const STATUS_LABEL = {
  high_risk: 'high-risk', not_high_risk_6_3: 'not high-risk under Art. 6(3)', transparency: 'transparency obligations',
  minimal: 'minimal', out_of_scope: 'outside the EU AI Act',
};

function classificationWhy(result) {
  const status = STATUS_LABEL[result.status] || result.status;
  const basis = result.basis ? ` (${result.basis})` : '';
  const tier = `tier ${result.tier}`;
  const prov = result.provisional ? ' The result is provisional: confirm the assumptions with Legal.' : '';
  return `Everything else builds on it: ${status}${basis}, ${tier}.${prov}`;
}

function rank(picked) {
  return picked
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => GATES.indexOf(a.gate) - GATES.indexOf(b.gate) || a.i - b.i)
    .slice(0, MAX)
    .map(({ requirement_id, title, why }, i) => ({ rank: i + 1, requirement_id, title, why }));
}
