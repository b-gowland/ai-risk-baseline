/**
 * baseline.js — core output computation engine
 *
 * buildOutput(config) → { regulatory, risks, controls, actions, platform, isBroad }
 *
 * All computation is deterministic and client-side.
 * No network requests. Runs in under 50ms for any valid config.
 */

import { evaluatePredicate, scoreRisk } from './predicate.js';
import { annotateWithDateState } from './date-aware.js';
import REG_MAPPINGS from '../data/regulatory-mappings.json';
import RISKS_MAPPINGS from '../data/risks-mappings.json';
import CONTROLS_INDEX from '../data/controls-index.json';

// Mandatory framework IDs (used for action prioritisation)
const MANDATORY_FRAMEWORK_IDS = new Set(
  REG_MAPPINGS.frameworks.filter(() => true).map(f => f.id)
);

/**
 * Build the full output for a given config.
 *
 * @param {Object} config - decoded config from URL or form state
 * @param {Date} today - current date (injectable for testing)
 * @returns {Object} { regulatory, risks, controls, actions, platform, isBroad }
 */
export function buildOutput(config, today = new Date()) {
  const isBroad = !config || isConfigBroad(config);

  // 1. Regulatory — filter mappings whose applies_when predicate matches
  const regulatory = REG_MAPPINGS.mappings
    .filter(m => evaluatePredicate(m.applies_when, config))
    .map(m => annotateWithDateState(m, today))
    .sort(sortRegulatory);

  // Group by framework for display
  const regulatoryByFramework = groupByFramework(regulatory, REG_MAPPINGS.frameworks);

  // 2. Risks — score, filter, rank, slice top 7
  const risks = RISKS_MAPPINGS.risks
    .map(r => ({ ...r, score: scoreRisk(r, config) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7)
    .map(r => attachRelevance(r, config));

  // 3. Controls — filter by applies_when predicate
  const controls = CONTROLS_INDEX.controls
    .filter(c => evaluatePredicate(c.applies_when, config));

  // Group by owner/function for display
  const controlsByFunction = groupControlsByFunction(controls);

  // 4. Actions — priority-based derivation from controls and regulatory
  const actions = buildActions(controls, regulatory, config);

  // 5. Platform — Phase 2 only; capture the selection for shareability
  const platform = config?.platform && config.platform !== 'skip'
    ? { id: config.platform, phase: 2 }
    : null;

  return {
    regulatory,
    regulatoryByFramework,
    risks,
    controls,
    controlsByFunction,
    actions,
    platform,
    isBroad,
    frameworksIndex: REG_MAPPINGS.frameworks,
  };
}

/**
 * Determine if the config is broad (many fields missing/unknown).
 * Used to display the "output is broader than it could be" banner.
 */
function isConfigBroad(config) {
  const missing = [
    !config.system_type || config.system_type === 'unknown',
    !config.context?.who,
    !config.context?.domain,
    !config.context?.decision_mode,
    !config.data?.data_type?.length,
    !config.jurisdiction?.length,
  ];
  return missing.filter(Boolean).length >= 2;
}

/**
 * Sort regulatory items: mandatory first, then by date state (in_force last for urgency).
 */
function sortRegulatory(a, b) {
  // Mandatory before recommended
  if (a.mandatory && !b.mandatory) return -1;
  if (!a.mandatory && b.mandatory) return 1;
  // Upcoming (urgent) before in_force before upcoming_distant
  const order = { upcoming: 0, in_force: 1, upcoming_distant: 2 };
  return (order[a.date_state] ?? 1) - (order[b.date_state] ?? 1);
}

/**
 * Group regulatory items by framework for tabular display.
 */
function groupByFramework(regulatory, frameworksIndex) {
  const frameworkMap = {};
  frameworksIndex.forEach(f => { frameworkMap[f.id] = f; });

  const groups = {};
  regulatory.forEach(item => {
    const fw = frameworkMap[item.framework] || { id: item.framework, name: item.framework };
    if (!groups[item.framework]) {
      groups[item.framework] = { framework: fw, items: [] };
    }
    groups[item.framework].items.push(item);
  });

  return Object.values(groups);
}

/**
 * Attach a relevance reason to a risk based on config context.
 */
function attachRelevance(risk, config) {
  const domain = config?.context?.domain;
  const template = risk.relevance_template;
  const reason = (template && domain && template[domain])
    ? template[domain]
    : (template?.default || '');
  return { ...risk, relevance_reason: reason };
}

/**
 * Group controls by primary owner function.
 */
function groupControlsByFunction(controls) {
  const functionOrder = ['risk', 'legal', 'tech', 'procurement'];
  const groups = {};
  functionOrder.forEach(fn => { groups[fn] = []; });

  controls.forEach(control => {
    const primaryOwner = control.owners?.[0] || 'risk';
    if (groups[primaryOwner]) {
      groups[primaryOwner].push(control);
    } else {
      // Multi-owner — add to each owner group
      control.owners?.forEach(owner => {
        if (groups[owner]) groups[owner].push(control);
      });
    }
  });

  // Remove empty groups
  return functionOrder
    .filter(fn => groups[fn].length > 0)
    .map(fn => ({ function: fn, controls: groups[fn] }));
}

/**
 * Build the top 5 prioritised actions from controls and regulatory items.
 *
 * Priority:
 * 1. High-effort controls with mandatory framework references
 * 2. Controls linked to regulatory items with upcoming deadlines (within 18mo)
 * 3. Medium-effort controls with mandatory framework references
 * 4. Low-effort controls with mandatory framework references
 */
export function buildActions(controls, regulatory, config) {
  // Mandatory regulatory IDs (for deadline detection)
  const mandatoryRegIds = new Set(
    regulatory.filter(r => r.mandatory).map(r => r.id)
  );

  // Score each control for action priority
  const scored = controls.map(control => {
    let score = 0;
    const effortMap = { High: 3, Medium: 2, Low: 1 };
    const effortScore = effortMap[control.effort] || 1;

    // Has mandatory framework reference
    const hasMandatory = control.frameworks?.some(f => f.includes('eu_ai_act') || f.includes('apra') || f.includes('au_privacy'));

    // Has upcoming deadline (regulatory item with upcoming date state)
    const hasUpcomingDeadline = regulatory.some(r =>
      r.date_state === 'upcoming' && r.mandatory && control.frameworks?.some(f => r.id.includes(f.replace('eu_ai_act_', '').replace('_', '')))
    );

    if (hasMandatory && control.effort === 'High') score += 100;
    if (hasUpcomingDeadline) score += 80;
    if (hasMandatory && control.effort === 'Medium') score += 60;
    if (hasMandatory && control.effort === 'Low') score += 40;
    score += effortScore; // tiebreaker

    return { ...control, _action_score: score };
  });

  // Sort by score desc, deduplicate by id, take top 5
  const actions = scored
    .filter(c => c._action_score > 0)
    .sort((a, b) => b._action_score - a._action_score)
    .slice(0, 5)
    .map((control, i) => ({
      rank: i + 1,
      name: control.name,
      owner: formatOwners(control.owners),
      effort: control.effort,
      why: control.summary.split('. ')[0] + '.',
      control_id: control.id,
      frameworks: control.frameworks,
    }));

  return actions;
}

/**
 * Format owner array to display string.
 */
function formatOwners(owners) {
  const labels = { risk: 'Risk', legal: 'Legal', tech: 'Technology', procurement: 'Procurement' };
  return (owners || []).map(o => labels[o] || o).join(' + ');
}
