/**
 * predicate.js — the v2 predicate language (spec §2)
 *
 *   { all: [...] }  AND
 *   { any: [...] }  OR
 *   { field: [values] }  leaf: equal to one of the values, or (multi-select) intersecting them
 *   { annex_iii_matched: true }  leaf: true after step 3 when a purpose maps to Annex III
 *
 * Exports:
 *   matches(pred, answers, ctx)  — boolean match, used for show_when
 *   evaluate(pred, answers)      — three-valued match (true | false | 'unsure'), used for
 *                                  annex_iii_condition so an 'unsure' answer stays visible
 */

function leaf(pred) {
  return Object.entries(pred)[0];
}

export function matches(pred, answers, ctx = {}) {
  if (!pred) return true;
  if (pred.all) return pred.all.every(p => matches(p, answers, ctx));
  if (pred.any) return pred.any.some(p => matches(p, answers, ctx));
  const [field, allowed] = leaf(pred);
  if (field === 'annex_iii_matched') return Boolean(ctx.annexIIIMatched) === allowed;
  const value = answers[field];
  if (value === undefined || value === null) return false;
  return Array.isArray(value) ? value.some(v => allowed.includes(v)) : allowed.includes(value);
}

/**
 * Returns { result: true | false | 'unsure', unsure: [field ids that were unsure] }.
 * A leaf is 'unsure' when its answer is 'unsure' and 'unsure' is not itself an allowed value.
 */
export function evaluate(pred, answers) {
  if (!pred) return { result: true, unsure: [] };
  if (pred.all || pred.any) {
    const parts = (pred.all || pred.any).map(p => evaluate(p, answers));
    const unsure = parts.flatMap(p => p.unsure);
    const results = parts.map(p => p.result);
    if (pred.all) {
      if (results.includes(false)) return { result: false, unsure: [] };
      return { result: results.includes('unsure') ? 'unsure' : true, unsure };
    }
    if (results.includes(true)) return { result: true, unsure: [] };
    return { result: results.includes('unsure') ? 'unsure' : false, unsure };
  }
  const [field, allowed] = leaf(pred);
  const value = answers[field];
  const isUnsure = Array.isArray(value) ? value.includes('unsure') : value === 'unsure';
  if (matches(pred, answers)) return { result: true, unsure: [] };
  if (isUnsure && !allowed.includes('unsure')) return { result: 'unsure', unsure: [field] };
  return { result: false, unsure: [] };
}
