/**
 * requirements.js — requirements library resolution (spec §10)
 *
 * requirementsStep(answers, result) → Requirement[]
 *
 *   Requirement = { id, title, summary, level, gate, sources: [{ framework, ref, url? }],
 *                   artefact, owners, effort, effective_from, why, existing? }
 *
 * result is the classification (status, obligations, effective_from, tier). Each library
 * entry's 'applies' predicate is evaluated against it; the leaves that matched become the
 * 'why'. EU sources are shown only when classify() lists their obligation, so a merged
 * requirement cites the EU article only where the Act actually applies.
 */

import LIBRARY from '../data/requirements.json' with { type: 'json' };
import GDPR from '../packs/gdpr.json' with { type: 'json' };
import UK from '../packs/uk.json' with { type: 'json' };
import AU from '../packs/au.json' with { type: 'json' };
import { FIELD_BY_ID } from './data.js';

export const REQUIREMENTS = LIBRARY.requirements;
/** Country packs (spec §11): same requirement schema, resolved after the core library. */
export const PACKS = [GDPR, UK, AU];
export const FRAMEWORKS = { ...LIBRARY.frameworks, ...Object.assign({}, ...PACKS.map(p => p.frameworks)) };
export const GATES = ['classify', 'design', 'build', 'pre_deploy', 'operate'];

const valueLabel = v => v.replace(/_/g, ' ');
const intersects = (a = [], b = []) => a.some(x => b.includes(x));

const PERSONAL_DATA = ['personal', 'special_category', 'biometric', 'children'];
// Data protection law does not reach purely personal use or national security (GDPR Art. 2(2)).
const NO_DATA_PROTECTION = ['personal_non_professional', 'military_defence_national_security'];
const JURISDICTION_LABEL = { eu: 'the EU', uk: 'the UK', au: 'Australia' };

const inJurisdiction = (answers, j) => (j === 'eu'
  ? ['yes', 'unsure'].includes(answers.eu_nexus)
  : (answers.other_jurisdictions || []).includes(j));

// Severity and autonomy fall back to the tier's cautious defaults when unsure (spec §6).
const severityOf = a => (['negligible', 'minor', 'material', 'serious'].includes(a.severity) ? a.severity : 'material');
const isSignificant = a => ['material', 'serious'].includes(severityOf(a)) && (a.affected || []).length > 0;
// Sample review or override is not meaningful human involvement in each decision.
const isSolelyAutomated = a => a.autonomy !== 'human_decides';

/**
 * Evaluate an 'applies' predicate. Returns the list of reasons when it matches, or null.
 * Leaves: always, status, obligation, tier_min, role, tech. Combinators: all, any.
 */
export function evaluate(pred, ctx) {
  if (pred.all) {
    const parts = pred.all.map(p => evaluate(p, ctx));
    return parts.every(Boolean) ? parts.flat() : null;
  }
  if (pred.any) {
    const parts = pred.any.map(p => evaluate(p, ctx)).filter(Boolean);
    return parts.length ? parts.flat() : null;
  }
  const [leaf, arg] = Object.entries(pred)[0];
  const { answers, result } = ctx;
  switch (leaf) {
    case 'always':
      return arg ? [] : null;
    case 'status':
      return arg.includes(result.status) ? [`EU AI Act status is ${valueLabel(result.status)}.`] : null;
    case 'obligation': {
      const hit = arg.filter(k => result.obligations.includes(k));
      return hit.length ? [`EU AI Act ${hit.map(citation).join(', ')} ${hit.length > 1 ? 'apply' : 'applies'} to you.`] : null;
    }
    case 'tier_min':
      return typeof result.tier === 'number' && result.tier >= arg ? [`Governance tier ${result.tier} expects this.`] : null;
    case 'role': {
      const hit = arg.filter(v => answers.role.includes(v));
      return hit.length ? [`Your role: ${hit.map(valueLabel).join(', ')}.`] : null;
    }
    case 'tech': {
      const hit = arg.filter(v => answers.tech.includes(v));
      return hit.length ? [`Technology: ${hit.map(valueLabel).join(', ')}.`] : null;
    }
    case 'jurisdiction': {
      const hit = arg.filter(j => inJurisdiction(answers, j));
      return hit.length ? [`It affects people in ${hit.map(j => JURISDICTION_LABEL[j] || j).join(' and ')}.`] : null;
    }
    case 'data': {
      const hit = arg.filter(v => (answers.data || []).includes(v));
      return hit.length ? [`It processes ${hit.map(valueLabel).join(', ')} data.`] : null;
    }
    case 'personal_data':
      return arg && intersects(answers.data, PERSONAL_DATA) && !NO_DATA_PROTECTION.includes(answers.scope_exclusion)
        ? ['It processes personal data.'] : null;
    case 'significant_decision':
      return arg && isSignificant(answers)
        ? ['Its outputs could significantly affect people.'] : null;
    case 'significant_automated':
      return arg && isSignificant(answers) && isSolelyAutomated(answers)
        ? ['It can make decisions that significantly affect people without a person deciding each case.'] : null;
    default:
      throw new Error(`requirements: unknown predicate leaf ${leaf}`);
  }
}

export const PREDICATE_LEAVES = ['always', 'status', 'obligation', 'tier_min', 'role', 'tech',
  'jurisdiction', 'data', 'personal_data', 'significant_decision', 'significant_automated'];

let CITATIONS;
function citation(key) {
  if (!CITATIONS) {
    CITATIONS = new Map();
    for (const r of REQUIREMENTS) for (const s of r.sources) if (s.obligation) CITATIONS.set(s.obligation, s.ref);
  }
  return CITATIONS.get(key) || key;
}

function sourcesFor(req, result) {
  const inScope = result.status !== 'out_of_scope';
  return req.sources
    .filter(s => (s.obligation ? result.obligations.includes(s.obligation) : !s.in_scope || inScope))
    .map(s => ({ framework: s.framework, ref: s.ref, url: s.url || FRAMEWORKS[s.framework].url }));
}

const ENTRIES = [
  ...REQUIREMENTS.map(req => ({ req })),
  ...PACKS.flatMap(p => p.requirements.map(req => ({ req, pack: p.id }))),
];

export function requirementsStep(rawAnswers, result) {
  const answers = { ...rawAnswers, role: rawAnswers.role || [], tech: rawAnswers.tech || [] };
  const ctx = { answers, result };
  const out = [];
  for (const { req, pack } of ENTRIES) {
    // A prohibited use case stops everything else, country packs included.
    if (pack && result.status === 'prohibited') continue;
    const reasons = evaluate(req.applies, ctx);
    if (!reasons) continue;
    const euKeys = req.sources.filter(s => s.obligation && result.obligations.includes(s.obligation)).map(s => s.obligation);
    const variant = euKeys.length && req.eu_variant ? req.eu_variant : {};
    const dates = euKeys.map(k => result.effective_from[k]).filter(Boolean).sort();
    const why = [...new Set(reasons)];
    if (!why.length && req.why) why.push(req.why);
    const r = {
      id: req.id,
      title: variant.title || req.title,
      summary: variant.summary || req.summary,
      level: req.level,
      gate: req.gate,
      sources: sourcesFor(req, result),
      artefact: variant.artefact || req.artefact,
      owners: [...req.owners],
      effort: variant.effort || req.effort,
      effective_from: dates[0] || req.effective_from || null,
      why: why.join(' '),
    };
    if (pack) r.pack = pack;
    if (req.existing_when_policy_inventory) {
      const v = answers.ai_policy_inventory;
      if (v === 'yes') {
        r.existing = true;
        r.why = `Existing: confirm it covers this use case. ${r.why}`;
      } else if (v === 'unsure' || v === undefined) {
        r.why = `Check whether this already exists. ${r.why}`;
      }
    }
    out.push(r);
  }
  return out;
}

/** Valid values for 'role' and 'tech' leaves (used by the tests). */
export function leafValues(leaf) {
  return FIELD_BY_ID.get(leaf)?.values || [];
}
