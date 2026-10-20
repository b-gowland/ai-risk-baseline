/**
 * present.js — turns a classify() result into what the v2 output page and exports show.
 * Pure functions, shared by the page and the Markdown/JSON/CSV exports.
 *
 * Phase 3 adds result.requirements and result.actions. Until they exist, the page falls back
 * to result.obligations (eu-obligations.json) grouped by role, and to first actions derived
 * from the blocking questions and the governance tier.
 */

import PURPOSES from '../data/purposes.json' with { type: 'json' };
import PROHIBITED from '../data/prohibited-practices.json' with { type: 'json' };
import EU from '../data/eu-obligations.json' with { type: 'json' };
import TIERS from '../data/tier-matrix.json' with { type: 'json' };
import {
  STATUS_LABELS, SCOPE_LABELS, ROLE_LABELS, GATE_LABELS, REQUIREMENT_GATES, OPEN_QUESTION_TEXT,
} from './labels.js';

const PURPOSE_BY_ID = new Map(PURPOSES.purposes.map(p => [p.id, p]));
const PRACTICE_BY_ID = new Map(PROHIBITED.practices.map(p => [p.id, p]));
const OBLIGATION_BY_ID = new Map(EU.obligations.map(o => [o.id, o]));

export const purposeById = id => PURPOSE_BY_ID.get(id);
export const practiceById = id => PRACTICE_BY_ID.get(id);
export const obligationById = id => OBLIGATION_BY_ID.get(id);

export function statusLabel(result) {
  return STATUS_LABELS[result.status] || result.status;
}

export const scopeLabel = scope => SCOPE_LABELS[scope] || scope;
export const roleLabel = role => ROLE_LABELS[role] || role;
export const gateLabel = gate => GATE_LABELS[gate] || gate;

export function basisLabel(basis) {
  if (!basis) return null;
  if (basis === 'annex_i') return 'Annex I regulated product (Art. 6(1))';
  if (basis.startsWith('annex_iii.')) return `Annex III point ${basis.slice('annex_iii.'.length)} (Art. 6(2))`;
  const p = practiceById(basis);
  if (p) return `${p.citation}: ${p.title}`;
  return basis;
}

/** Every basis, e.g. Annex I and Annex III together. Falls back to 'Annex III, point unknown' for purpose unsure. */
export function basesLabels(result) {
  const list = (result.bases || []).map(basisLabel);
  // Purpose unsure: the engine treats it as an Annex III candidate with no known point.
  if ((result.open_questions || []).some(q => q.gate === 'purpose')) list.push('Annex III, point unknown until the purpose is confirmed');
  if (!list.length && result.basis) list.push(basisLabel(result.basis));
  return list;
}

/** "Treat as in scope" → "treat as in scope", for use mid-sentence. */
export const midSentence = s => (s ? s[0].toLowerCase() + s.slice(1) : s);

const fmtDate = iso => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const [y, m, d] = iso.split('-').map(Number);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${d} ${month} ${y}`;
};
export const formatDate = fmtDate;

/** Key dates: obligations grouped by the date they apply from, earliest first. */
export function keyDates(result) {
  const byDate = new Map();
  for (const [id, date] of Object.entries(result.effective_from || {})) {
    if (!date) continue;
    const o = obligationById(id);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(o ? o.citation : id);
  }
  return [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([date, refs]) => ({ date, label: fmtDate(date), refs }));
}

/** Tier expectations, cumulative from tier 1, with the "Tier N" back-references removed. */
export function tierExpectations(tier) {
  if (tier === 'P') return [];
  const out = [];
  for (let t = 1; t <= Number(tier); t++) {
    const def = TIERS.tiers[String(t)];
    out.push({ tier: t, name: def.name, items: (def.expects || []).filter(e => !/^Tier \d$/.test(e)) });
  }
  return out;
}

export function tierInfo(tier) {
  const def = TIERS.tiers[String(tier)] || {};
  return { tier, name: def.name, summary: def.summary };
}

export function openQuestionText(q) {
  if (q.gate.startsWith('prohibited.')) {
    const p = practiceById(q.gate.slice('prohibited.'.length));
    return {
      ask: OPEN_QUESTION_TEXT.prohibited.ask.replace('{title}', p ? `${p.title} (${p.citation})` : q.gate),
      who: OPEN_QUESTION_TEXT.prohibited.who,
    };
  }
  return OPEN_QUESTION_TEXT[q.gate] || { ask: `Confirm the answer to "${q.field}".`, who: 'Legal' };
}

export const hasRequirements = result => Array.isArray(result.requirements);

/** Requirements grouped by lifecycle gate, in gate order; empty gates dropped. */
export function requirementsByGate(result) {
  const reqs = result.requirements || [];
  const known = REQUIREMENT_GATES.map(g => ({ gate: g, label: gateLabel(g), items: reqs.filter(r => r.gate === g) }));
  const other = reqs.filter(r => !REQUIREMENT_GATES.includes(r.gate));
  if (other.length) known.push({ gate: 'other', label: 'Other', items: other });
  return known.filter(g => g.items.length);
}

/** Fallback while result.requirements is absent: the user's EU obligations grouped by role. */
export function obligationsByRole(result) {
  const roles = result.roles || [];
  const groups = roles.map(role => ({ role, label: roleLabel(role), items: [] }));
  for (const id of result.obligations || []) {
    const o = obligationById(id);
    if (!o) continue;
    const item = { id, citation: o.citation, title: o.title, effective_from: (result.effective_from || {})[id] || null };
    const holders = o.role.filter(r => roles.includes(r));
    for (const g of groups) if (holders.includes(g.role)) g.items.push(item);
    if (!holders.length) {
      let g = groups.find(x => x.role === 'all');
      if (!g) groups.push(g = { role: 'all', label: 'All roles', items: [] });
      g.items.push(item);
    }
  }
  return groups.filter(g => g.items.length);
}

/**
 * First 5 actions: result.actions when present; otherwise derived from the blocking open
 * questions and the tier's expectations (marked derived: true).
 */
export function firstActions(result) {
  if (Array.isArray(result.actions)) {
    const byId = new Map((result.requirements || []).map(r => [r.id, r]));
    return {
      derived: false,
      items: [...result.actions].sort((a, b) => a.rank - b.rank).slice(0, 5).map(a => ({
        rank: a.rank, title: a.title || byId.get(a.requirement_id)?.title || a.requirement_id, why: a.why, requirement_id: a.requirement_id,
      })),
    };
  }
  const items = [];
  if (result.status === 'prohibited') {
    items.push({ title: 'Stop: do not develop, place on the market or use this system', why: 'A prohibited-practice screen item was answered yes.' });
    items.push({ title: 'Escalate to Legal and record the decision', why: 'Document the screen answers and who confirmed them.' });
  }
  for (const q of (result.open_questions || []).filter(x => x.blocking)) {
    items.push({ title: `Resolve: ${openQuestionText(q).ask}`, why: `Blocking. Until resolved: ${midSentence(q.assumption)}.` });
  }
  if (result.status !== 'prohibited') items.push(...derivedSteps(result))
  return { derived: true, items: items.slice(0, 5).map((a, i) => ({ rank: i + 1, ...a })) };
}

// Dependency order from the review (§4.3): log the classification → inventory → impact
// assessment → what blocks go-live → monitoring and incidents.
function derivedSteps(result) {
  const tier = Number(result.tier);
  const has = id => (result.obligations || []).includes(id);
  const steps = [
    { title: 'Log the classification and the answers behind it', why: 'Keeps the "because" trace as evidence for the decision.' },
    { title: 'Add it to the AI inventory and name a business owner', why: 'Expected at every governance tier.' },
  ];
  if (tier >= 3) steps.push({ title: 'Run an AI system impact assessment (ISO/IEC 42005-style)', why: `Expected at governance tier ${tier}.` });
  else if (tier === 2) steps.push({ title: 'Document a proportionate risk assessment (ISO/IEC 23894 process)', why: 'Expected at governance tier 2.' });
  if (has('eu.art_9')) steps.push({ title: 'Set up the risk management system and technical documentation', why: 'Art. 9 and Art. 11 must be in place before the system is placed on the market.' });
  if (has('eu.art_27')) steps.push({ title: 'Carry out the fundamental rights impact assessment', why: 'Art. 27: required before first use.' });
  else if (has('eu.art_26')) steps.push({ title: 'Plan your deployer duties: use per instructions, oversight, monitoring and logs', why: 'Art. 26.' });
  if (has('eu.art_6_4')) steps.push({ title: 'Document the Art. 6(3) assessment and register the system', why: 'Art. 6(4) and Art. 49(2): before it is placed on the market.' });
  for (const id of ['eu.art_50_1', 'eu.art_50_2', 'eu.art_50_3', 'eu.art_50_4']) {
    if (has(id)) steps.push({ title: `Meet the transparency duty: ${obligationById(id).title.toLowerCase()}`, why: `${obligationById(id).citation}.` });
  }
  if ((result.notes || []).some(n => /sits with the/.test(n.text))) {
    steps.push({ title: 'Confirm your provider meets its transparency duties', why: 'The Art. 50 duty applies to the system but sits with the provider.' });
  }
  if (tier >= 2) steps.push({ title: 'Set up performance monitoring and an incident route', why: `Expected at governance tier ${tier}.` });
  steps.push({ title: 'Make sure users have AI literacy support', why: has('eu.art_4') ? 'Art. 4, and expected at every tier.' : 'Expected at every governance tier.' });
  return steps;
}
