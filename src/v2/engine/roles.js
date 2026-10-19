/**
 * roles.js — Step 6: roles (Art. 3, Art. 25), spec §3
 *
 * rolesStep(answers, status) → { roles, provisional, open_questions, trace, notes }
 */

import { because } from './answers.js';

const ROLE_ORDER = ['provider', 'deployer', 'importer_distributor', 'gpai_provider'];

export function rolesStep(answers, status) {
  const roles = new Set();
  const open_questions = [];
  const trace = [];
  const notes = [];
  const highRisk = status === 'high_risk';
  let provisional = false;
  const rule = (r, text) => trace.push({ step: 6, rule: text, because: [`role includes ${r}`] });

  for (const r of answers.role) {
    switch (r) {
      case 'build_own_use':
        roles.add('provider').add('deployer');
        rule(r, 'Art. 3(3)-(4): provider putting into service for own use, and deployer');
        break;
      case 'build_supply':
        roles.add('provider');
        rule(r, 'Art. 3(3): provider');
        break;
      case 'deploy_vendor':
        roles.add('deployer');
        rule(r, 'Art. 3(4): deployer');
        break;
      case 'put_name_on_or_substantially_modify':
      case 'repurpose_to_high_risk': {
        roles.add('deployer');
        const point = r === 'repurpose_to_high_risk' ? '(c)' : '(a)-(b)';
        if (highRisk) {
          roles.add('provider');
          rule(r, `Art. 25(1)${point}: deployer becomes provider of the high-risk system`);
          notes.push({ ref: 'Art. 25(2)', text: 'The initial provider is no longer the provider but must cooperate (technical documentation, known limitations, targeted technical access), unless it clearly specified that the system must not be turned into a high-risk system: check the vendor terms.' });
        } else {
          rule(r, `Art. 25(1)${point}: applies only to high-risk systems, so deployer only`);
        }
        break;
      }
      case 'import_or_distribute':
        roles.add('importer_distributor');
        rule(r, 'Art. 3(6)-(7): importer or distributor');
        break;
      case 'gpai_model_provider':
        roles.add('gpai_provider');
        rule(r, 'Art. 3(63), Art. 53: general-purpose AI model provider');
        open_questions.push({ gate: 'gpai_systemic', field: 'role', assumption: 'Art. 55 applies only if the model meets the Art. 51 systemic-risk threshold: confirm', blocking: false });
        break;
      case 'unsure':
        roles.add('provider').add('deployer');
        provisional = true;
        open_questions.push({ gate: 'role', field: 'role', assumption: 'Provider and deployer', blocking: false });
        trace.push({ step: 6, rule: 'Role unknown, treated as provider and deployer', because: because(answers, 'role') });
        break;
    }
  }
  if ((answers.tech || []).includes('third_party_model') && !roles.has('gpai_provider')) {
    notes.push({ ref: 'Art. 53', text: 'Building on a third-party general-purpose model through its API does not make you a GPAI model provider; only a substantial modification of the model itself can.' });
  }
  return { roles: ROLE_ORDER.filter(r => roles.has(r)), provisional, open_questions, trace, notes };
}
