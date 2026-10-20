/**
 * url-state.js — v2 answers ⇄ URL query params
 *
 * The URL is the save format, so a result can be shared. Format (v=2):
 *
 *   v=2                          format version (required; anything else decodes to null)
 *   n=<text>                     optional use-case name (UI only, max 120 chars)
 *   <key>=<value>                single-select: the value id as-is
 *   <key>=<a>.<b>                multi-select: value ids joined by '.'; an empty param is an
 *                                answered-but-empty list (e.g. interaction "none of these")
 *   x=ay.fu.ban                  prohibited map: key suffix after 'art_5_1' + y|n|u
 *   d63=npy.pfn                  art_6_3 map: two-letter key code + y|n|u (empty param: {})
 *
 * Param keys and map codes are fixed here and must never be reused for something else, so
 * old links keep decoding. Unknown fields and values are dropped on decode, never guessed.
 *
 * encodeAnswers(answers, name?) → URLSearchParams
 * decodeAnswers(params)         → { answers, name } | null
 */

import MODEL from '../data/answer-model.json' with { type: 'json' };
import PURPOSES from '../data/purposes.json' with { type: 'json' };
import PROHIBITED from '../data/prohibited-practices.json' with { type: 'json' };

export const URL_VERSION = '2';
export const NAME_MAX = 120;

// field id → param key. Append only.
export const PARAM_KEYS = {
  purpose: 'p',
  prohibited: 'x',
  eu_nexus: 'eu',
  scope_exclusion: 'se',
  role: 'r',
  org_type: 'ot',
  org_size: 'os',
  annex_i_product: 'a1',
  art_6_3: 'd63',
  interaction: 'i',
  autonomy: 'au',
  severity: 'sv',
  reversible: 'rv',
  affected: 'af',
  data: 'd',
  tech: 't',
  stage: 'st',
  ai_policy_inventory: 'pol',
};

const MAP_VALUE = { yes: 'y', no: 'n', unsure: 'u' };
const MAP_VALUE_BACK = { y: 'yes', n: 'no', u: 'unsure' };

const PROHIBITED_PREFIX = 'art_5_1';
const ART_6_3_CODES = {
  narrow_procedural: 'np',
  improves_completed_human_activity: 'ic',
  pattern_detection_with_review: 'pd',
  preparatory: 'pr',
  profiling: 'pf',
};

const FIELDS = MODEL.fields;
const PURPOSE_IDS = PURPOSES.purposes.map(p => p.id);
const PRACTICE_IDS = PROHIBITED.practices.map(p => p.id);

/** Allowed values for a single or multi field. */
export function allowedValues(field) {
  if (field.values_from === 'purposes') return [...PURPOSE_IDS, ...(field.extra_values || [])];
  return [...(field.values || []), ...(field.extra_values || [])];
}

function mapKeyCodes(field) {
  if (field.id === 'prohibited') {
    return Object.fromEntries(PRACTICE_IDS.map(id => [id, id.slice(PROHIBITED_PREFIX.length)]));
  }
  return ART_6_3_CODES;
}

export function encodeAnswers(answers = {}, name = '') {
  const params = new URLSearchParams();
  params.set('v', URL_VERSION);
  const trimmed = (name || '').trim().slice(0, NAME_MAX);
  if (trimmed) params.set('n', trimmed);
  for (const f of FIELDS) {
    const key = PARAM_KEYS[f.id];
    const v = answers[f.id];
    if (v === undefined || v === null) continue;
    if (f.type === 'map') {
      const codes = mapKeyCodes(f);
      const parts = Object.entries(v)
        .filter(([k, val]) => codes[k] !== undefined && MAP_VALUE[val])
        .map(([k, val]) => codes[k] + MAP_VALUE[val]);
      params.set(key, parts.join('.'));
    } else if (f.type === 'multi') {
      if (Array.isArray(v)) params.set(key, v.join('.'));
    } else if (v !== '') {
      params.set(key, v);
    }
  }
  return params;
}

export function decodeAnswers(input) {
  const params = input instanceof URLSearchParams ? input : new URLSearchParams(input);
  if (params.get('v') !== URL_VERSION) return null;
  const answers = {};
  for (const f of FIELDS) {
    const raw = params.get(PARAM_KEYS[f.id]);
    if (raw === null) continue;
    if (f.type === 'map') {
      const back = Object.fromEntries(Object.entries(mapKeyCodes(f)).map(([k, c]) => [c, k]));
      const map = {};
      for (const part of raw.split('.')) {
        const k = back[part.slice(0, -1)];
        const val = MAP_VALUE_BACK[part.slice(-1)];
        if (k && val && (f.values || []).includes(val)) map[k] = val;
      }
      answers[f.id] = map;
    } else if (f.type === 'multi') {
      const allowed = allowedValues(f);
      answers[f.id] = raw === '' ? [] : [...new Set(raw.split('.'))].filter(x => allowed.includes(x));
    } else if (allowedValues(f).includes(raw)) {
      answers[f.id] = raw;
    }
  }
  const name = (params.get('n') || '').slice(0, NAME_MAX);
  return { answers, name };
}

/** Query string (with leading '?') for a route. */
export function toSearch(answers, name) {
  return `?${encodeAnswers(answers, name).toString()}`;
}
