/**
 * data.js — v2 spec data, loaded once and indexed for the engine modules.
 *
 * Spec: docs/v2/classification-spec.md (data files table)
 */

import MODEL from '../data/answer-model.json' with { type: 'json' };
import PURPOSES from '../data/purposes.json' with { type: 'json' };
import PROHIBITED from '../data/prohibited-practices.json' with { type: 'json' };
import EU_OBLIGATIONS from '../data/eu-obligations.json' with { type: 'json' };
import TIER_MATRIX from '../data/tier-matrix.json' with { type: 'json' };

export const FIELDS = MODEL.fields;
export const FIELD_BY_ID = new Map(FIELDS.map(f => [f.id, f]));
export const PURPOSE_BY_ID = new Map(PURPOSES.purposes.map(p => [p.id, p]));
export const PRACTICES = PROHIBITED.practices;
export const OBLIGATIONS = EU_OBLIGATIONS.obligations;
export const OBLIGATION_BY_ID = new Map(OBLIGATIONS.map(o => [o.id, o]));
export const OBLIGATION_DATES = EU_OBLIGATIONS.dates;
export const TIERS = TIER_MATRIX;
