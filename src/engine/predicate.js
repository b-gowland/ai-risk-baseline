/**
 * predicate.js — rule engine predicate evaluator
 *
 * Predicate language:
 *   { "all": [...predicates] }  → logical AND
 *   { "any": [...predicates] }  → logical OR
 *   { "field.path": ["value1", "value2"] } → leaf: config field must include one of the values
 *
 * Field paths support dot notation for nested config:
 *   "context.who" → config.context.who
 *   "context.domain" → config.context.domain
 *   "jurisdiction" → config.jurisdiction (array, multi-select)
 *   "context.data_type" → config.data.data_type (array, multi-select)
 *   "context.data_scale" → config.data.data_scale
 *   "context.decision_mode" → config.context.decision_mode
 *   "context.build_path" → config.context.build_path
 *
 * Config shape (from URL state or configuration form):
 * {
 *   system_type: string,
 *   context: {
 *     who: string,
 *     domain: string,
 *     decision_mode: string,
 *     build_path: string,
 *   },
 *   data: {
 *     data_type: string[],   // multi-select
 *     data_scale: string,
 *   },
 *   jurisdiction: string[],  // multi-select
 *   platform: string,
 * }
 */

/**
 * Get a value from config using a dot-notation path.
 * Handles the mapping between predicate field names and config structure.
 */
function getField(config, fieldPath) {
  // Special mappings for predicate field paths
  const fieldMap = {
    'system_type': () => config.system_type,
    'jurisdiction': () => config.jurisdiction || [],
    'context.who': () => config.context?.who,
    'context.domain': () => config.context?.domain,
    'context.decision_mode': () => config.context?.decision_mode,
    'context.build_path': () => config.context?.build_path,
    'context.data_type': () => config.data?.data_type || [],
    'context.data_scale': () => config.data?.data_scale,
    'data.data_type': () => config.data?.data_type || [],
    'data.scale': () => config.data?.data_scale,
    'platform': () => config.platform,
  };

  if (fieldMap[fieldPath]) {
    return fieldMap[fieldPath]();
  }

  // Generic dot-notation traversal fallback
  return fieldPath.split('.').reduce((obj, key) => obj?.[key], config);
}

/**
 * Evaluate a predicate against a config object.
 * Returns true if the predicate matches, false otherwise.
 */
export function evaluatePredicate(predicate, config) {
  if (!predicate || !config) return false;

  // AND: all sub-predicates must match
  if (predicate.all) {
    return predicate.all.every(p => evaluatePredicate(p, config));
  }

  // OR: at least one sub-predicate must match
  if (predicate.any) {
    return predicate.any.some(p => evaluatePredicate(p, config));
  }

  // Leaf: { fieldPath: [allowedValues] }
  const entries = Object.entries(predicate);
  if (entries.length !== 1) {
    console.warn('Invalid predicate leaf — expected exactly one key:', predicate);
    return false;
  }

  const [fieldPath, allowedValues] = entries[0];

  // Skip internal meta-predicates (used in actions-template only)
  if (fieldPath.startsWith('id')) return true;

  const configValue = getField(config, fieldPath);

  if (configValue === null || configValue === undefined) return false;

  // If config value is an array (e.g. jurisdiction, data_type), check intersection
  if (Array.isArray(configValue)) {
    return configValue.some(v => allowedValues.includes(v));
  }

  // If allowed values is an array, check inclusion
  if (Array.isArray(allowedValues)) {
    return allowedValues.includes(configValue);
  }

  return configValue === allowedValues;
}

/**
 * Score a risk against a config.
 * Returns sum of weights where weight.when predicate matches.
 */
export function scoreRisk(risk, config) {
  if (!risk.weights) return 0;
  return risk.weights.reduce((total, weightRule) => {
    if (evaluatePredicate(weightRule.when, config)) {
      return total + weightRule.weight;
    }
    return total;
  }, 0);
}
