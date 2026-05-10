/**
 * url-state.js — encode and decode configuration to/from URL query params
 *
 * URL format (human-readable, survives email forwarding):
 * ?st=predictive&who=customer_facing&dom=financial_services&dm=automated_decision
 * &bp=in_house&dt=personal_financial,personal_basic&ds=10k_100k&juris=eu,au&plat=skip&v=1
 *
 * Schema versioning: v=1 is the current schema.
 * Adding new questions: add new param keys; old URLs without the param fall back to null.
 * Never remove or rename existing param keys — instead, alias them in decode().
 */

const SCHEMA_VERSION = '1';

/**
 * Encode a config object to URL search params.
 * @param {Object} config
 * @returns {URLSearchParams}
 */
export function encodeConfig(config) {
  const params = new URLSearchParams();
  params.set('v', SCHEMA_VERSION);

  if (config.system_type) params.set('st', config.system_type);
  if (config.context?.who) params.set('who', config.context.who);
  if (config.context?.domain) params.set('dom', config.context.domain);
  if (config.context?.decision_mode) params.set('dm', config.context.decision_mode);
  if (config.context?.build_path) params.set('bp', config.context.build_path);

  if (config.data?.data_type?.length) {
    params.set('dt', config.data.data_type.join(','));
  }
  if (config.data?.data_scale) params.set('ds', config.data.data_scale);

  if (config.jurisdiction?.length) {
    params.set('juris', config.jurisdiction.join(','));
  }
  if (config.platform) params.set('plat', config.platform);

  return params;
}

/**
 * Decode URL search params to a config object.
 * Returns null if the URL is invalid/missing.
 * Returns a partial config (with nulls) if some params are missing — this is normal for "Don't know" / skipped answers.
 *
 * @param {URLSearchParams} params
 * @returns {Object|null}
 */
export function decodeConfig(params) {
  if (!params) return null;

  // Version check — currently only v=1; future versions can be migrated here
  const version = params.get('v');
  if (version && version !== SCHEMA_VERSION) {
    console.warn(`URL config schema version mismatch: expected ${SCHEMA_VERSION}, got ${version}`);
    // Still attempt to decode — most keys will be compatible
  }

  // Must have at least system_type to be a valid config
  const st = params.get('st');
  if (!st) return null;

  const dt = params.get('dt');
  const juris = params.get('juris');

  return {
    system_type: st,
    context: {
      who: params.get('who') || null,
      domain: params.get('dom') || null,
      decision_mode: params.get('dm') || null,
      build_path: params.get('bp') || null,
    },
    data: {
      data_type: dt ? dt.split(',').filter(Boolean) : [],
      data_scale: params.get('ds') || null,
    },
    jurisdiction: juris ? juris.split(',').filter(Boolean) : [],
    platform: params.get('plat') || 'skip',
  };
}

/**
 * Check if a config is complete (all required fields answered).
 * Returns an array of missing field IDs. Empty array = complete.
 */
export function getMissingFields(config) {
  if (!config) return ['system_type'];
  const missing = [];
  if (!config.system_type) missing.push('system_type');
  if (!config.context?.who) missing.push('context.who');
  if (!config.context?.domain) missing.push('context.domain');
  if (!config.context?.decision_mode) missing.push('context.decision_mode');
  if (!config.data?.data_type?.length) missing.push('data.data_type');
  if (!config.data?.data_scale) missing.push('data.data_scale');
  if (!config.jurisdiction?.length) missing.push('jurisdiction');
  return missing;
}

/**
 * Check if a config is partial (some required fields missing).
 */
export function isPartialConfig(config) {
  return getMissingFields(config).length > 0;
}

/**
 * Build the shareable output URL for a config.
 */
export function buildShareUrl(config, baseUrl = window.location.origin) {
  const params = encodeConfig(config);
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/output?${params.toString()}`;
}
