/**
 * obligations.js — EU obligation rules (spec §5)
 *
 * obligationsStep(ctx) → { obligations: [eu.*], effective_from: { key: ISO date },
 *                          open_questions, trace, notes }
 *
 * RULES says when each obligation applies to the system. Who holds it comes from the
 * obligation's 'role' in eu-obligations.json: an obligation applies to the user only if
 * one of their roles holds it. Dates come from eu-obligations.json too.
 *
 * ctx = { answers, status, roles, annexI, annexIII: { matched, ref }, prohibited, triggers, severity }
 */

import { OBLIGATIONS, OBLIGATION_DATES } from './data.js';
import { because } from './answers.js';

const PUBLIC_SERVICE = ['public_authority', 'private_public_service'];
const FRIA_POINTS = ['5(b)', '5(c)'];
const ART_86_SEVERITY = ['material', 'serious'];

const highRisk = c => c.status === 'high_risk';
// Annex III, not point 2. An unknown point (purpose unsure) is treated as not point 2.
const annexIIIPeople = c => highRisk(c) && c.annexIII.matched && c.annexIII.ref !== '2';
const orgIs = (c, types) => types.includes(c.answers.org_type) || c.answers.org_type === 'unsure';
const triggered = (c, key) => !['prohibited', 'out_of_scope'].includes(c.status) && c.triggers.some(t => t.key === key);

const PROVIDER_HIGH_RISK = ['art_9', 'art_10', 'art_11', 'art_12', 'art_13', 'art_14', 'art_15', 'art_16', 'art_17', 'art_43', 'art_47', 'art_72', 'art_73'];

export const RULES = {
  'eu.art_4': c => c.status !== 'prohibited',
  ...Object.fromEntries(PROVIDER_HIGH_RISK.map(k => [`eu.${k}`, highRisk])),
  'eu.art_49_1': c => highRisk(c) && c.annexIII.matched && c.annexIII.ref !== '2',
  'eu.art_6_4': c => c.status === 'not_high_risk_6_3',
  'eu.art_49_2': c => c.status === 'not_high_risk_6_3',
  'eu.art_23': highRisk,
  'eu.art_24': highRisk,
  'eu.art_26': highRisk,
  'eu.art_26_7': c => highRisk(c) && c.answers.affected.includes('staff'),
  'eu.art_26_11': annexIIIPeople,
  'eu.art_27': c => annexIIIPeople(c) &&
    (orgIs(c, PUBLIC_SERVICE) || c.annexIII.ref === null || FRIA_POINTS.includes(c.annexIII.ref)),
  'eu.art_49_3': c => annexIIIPeople(c) && orgIs(c, ['public_authority']),
  'eu.art_86': c => annexIIIPeople(c) && ART_86_SEVERITY.includes(c.severity),
  'eu.art_50_1': c => triggered(c, 'eu.art_50_1'),
  'eu.art_50_2': c => triggered(c, 'eu.art_50_2'),
  'eu.art_50_3': c => triggered(c, 'eu.art_50_3'),
  'eu.art_50_4': c => triggered(c, 'eu.art_50_4'),
  'eu.art_53': c => c.status !== 'prohibited',
  // Art. 55 is always an open question in v2 (gpai_systemic), never a listed obligation.
  'eu.art_55': () => false,
};

const isProhibitionKey = key => /^eu\.art_5_1[a-z]+$/.test(key);
const TRANSPARENCY_KEYS = ['eu.art_50_1', 'eu.art_50_2', 'eu.art_50_3', 'eu.art_50_4'];
const ROLE_LABEL = { provider: 'provider', deployer: 'deployer', importer_distributor: 'importer or distributor', gpai_provider: 'GPAI model provider' };

function dateFor(o, ctx) {
  if (o.effective_from === 'basis') return ctx.annexI ? OBLIGATION_DATES.annex_i : OBLIGATION_DATES.annex_iii;
  return OBLIGATION_DATES[o.effective_from] || o.effective_from;
}

export function obligationsStep(ctx) {
  const { answers, status, roles } = ctx;
  const obligations = [];
  const effective_from = {};
  const open_questions = [];
  const trace = [];
  const notes = [];
  const add = (o, rule) => {
    obligations.push(o.id);
    effective_from[o.id] = dateFor(o, ctx);
    trace.push({ step: 'obligations', rule, because: [`status=${status}`, `roles=[${roles.join(', ')}]`] });
  };

  if (status === 'out_of_scope') {
    trace.push({ step: 'obligations', rule: 'Out of scope: no EU AI Act obligations', because: [`status=${status}`] });
    return { obligations, effective_from, open_questions, trace, notes };
  }

  if (status === 'prohibited') {
    for (const p of ctx.prohibited) {
      const o = OBLIGATIONS.find(x => x.id === `eu.${p.id}`);
      add(o, `${o.citation}: do not develop, place on the market or use; nothing else is built on this use case`);
    }
    return { obligations, effective_from, open_questions, trace, notes };
  }

  for (const o of OBLIGATIONS) {
    if (isProhibitionKey(o.id) || !RULES[o.id](ctx)) continue;
    if (o.role.some(r => roles.includes(r))) {
      add(o, `${o.citation}: ${o.applies}`);
    } else if (TRANSPARENCY_KEYS.includes(o.id)) {
      const holder = o.role.map(r => ROLE_LABEL[r]).join(' or ');
      notes.push({ ref: o.citation, text: `This duty sits with the ${holder}: check they meet it.` });
      trace.push({ step: 'obligations', rule: `${o.citation}: applies to the system but sits with the ${holder}, not listed as yours`, because: [`roles=[${roles.join(', ')}]`] });
    }
  }

  // Conservative assumptions that changed the list (spec §4).
  const orgDecides = ['eu.art_27', 'eu.art_49_3'].filter(k => obligations.includes(k));
  if (answers.org_type === 'unsure' && orgDecides.length) {
    open_questions.push({ gate: 'org_type', field: 'org_type', assumption: `Condition met: ${orgDecides.join(', ')} apply`, blocking: false });
  }
  if (highRisk(ctx) && ctx.annexIII.matched && ctx.annexIII.ref === null && obligations.includes('eu.art_27')) {
    trace.push({ step: 'obligations', rule: 'Annex III point unknown: deployer duties for Annex III (not point 2) applied conservatively', because: because(answers, 'purpose') });
  }

  // Notes the output carries alongside the list (spec §5).
  if (highRisk(ctx)) {
    if (roles.includes('provider') && ['sme', 'small_mid_cap'].includes(answers.org_size)) {
      notes.push({ ref: 'Arts. 11(1), 17(2), 99', text: 'SME / small mid-cap: no obligations are removed, but technical documentation may be simplified, the QMS may be proportionate, and penalty caps are lower.' });
    }
    if (answers.data.includes('special_category')) {
      notes.push({ ref: 'Art. 4a', text: 'Special-category data may be processed where strictly necessary for bias detection and correction, under conditions (a)-(f).' });
    }
    if (obligations.includes('eu.art_27')) {
      notes.push({ ref: 'Art. 27(4)-(5)', text: 'The FRIA may cross-refer to a GDPR Art. 35 DPIA; the AI Office is to publish a questionnaire template.' });
    }
    notes.push({ ref: 'Art. 111(2)', text: 'Systems placed on the market before the application date are covered only if their design changes significantly afterwards (not asked yet). Systems intended for use by public authorities must comply by 2 Aug 2030 regardless.' });
  }
  if (obligations.includes('eu.art_4')) {
    notes.push({ ref: 'Art. 4', text: 'As amended in 2026: take measures to support AI literacy; no guaranteed level is required.' });
  }
  return { obligations, effective_from, open_questions, trace, notes };
}
