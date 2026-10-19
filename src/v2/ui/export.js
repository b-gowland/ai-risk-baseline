/**
 * export.js — v2 baseline exports: Markdown, versioned JSON and CSV (pure functions).
 *
 * buildExportModel(...)    → the JSON document (schema + schema_version)
 * toMarkdown(model)        → string
 * toCsv(model)             → string, one row per requirement (or EU obligation while the
 *                            requirements library is absent) and per open question
 */

import {
  statusLabel, scopeLabel, roleLabel, basesLabels, keyDates, tierInfo, tierExpectations,
  openQuestionText, hasRequirements, requirementsByGate, obligationsByRole, firstActions,
  formatDate, purposeById, midSentence,
} from './present.js';
import { FIELD_TITLES, valueLabel } from './labels.js';
import MODEL from '../data/answer-model.json' with { type: 'json' };

export const EXPORT_SCHEMA = 'ai-governance-baseline/use-case';
export const EXPORT_SCHEMA_VERSION = '2.0.0';

const DISCLAIMER = 'A starting point, not legal advice. This baseline is not a compliance determination. Verify every citation against the primary sources and consult qualified advisors for your situation.';

export function buildExportModel({ answers, name = '', result, url = '', generatedAt = new Date().toISOString(), today }) {
  const actions = firstActions(result);
  return {
    schema: EXPORT_SCHEMA,
    schema_version: EXPORT_SCHEMA_VERSION,
    generated_at: generatedAt,
    ...(today ? { law_as_of: today } : {}),
    disclaimer: DISCLAIMER,
    use_case: { name: name || null, url: url || null },
    answers,
    classification: {
      scope: result.scope,
      status: result.status,
      basis: result.basis,
      bases: result.bases || [],
      provisional: result.provisional,
      roles: result.roles,
      effective_from: result.effective_from || {},
    },
    tier: result.tier,
    first_actions: { derived: actions.derived, items: actions.items },
    requirements: hasRequirements(result) ? result.requirements : null,
    obligations: result.obligations || [],
    open_questions: result.open_questions || [],
    notes: result.notes || [],
    trace: result.trace || [],
  };
}

function answerLines(answers) {
  const lines = [];
  for (const f of MODEL.fields) {
    const v = answers[f.id];
    if (v === undefined) continue;
    let text;
    if (f.id === 'purpose') text = v === 'unsure' ? 'Unsure' : (purposeById(v)?.label || v);
    else if (f.type === 'map') text = Object.entries(v).map(([k, val]) => `${k}: ${val}`).join(', ') || '—';
    else if (Array.isArray(v)) text = v.length ? v.map(x => valueLabel(f.id, x)).join(', ') : 'None';
    else text = valueLabel(f.id, v);
    lines.push(`- **${FIELD_TITLES[f.id] || f.id}:** ${text}`);
  }
  return lines;
}

export function toMarkdown(model, result) {
  const r = result;
  const out = [];
  const tier = tierInfo(model.tier);
  out.push(`# AI governance baseline${model.use_case.name ? `: ${model.use_case.name}` : ''}`);
  out.push('');
  out.push(`> ${DISCLAIMER}`);
  out.push('');
  out.push(`Generated ${model.generated_at.slice(0, 10)} · schema ${model.schema} v${model.schema_version}`);
  if (model.use_case.url) out.push(`\nEdit or share: ${model.use_case.url}`);
  out.push('');

  const blocking = model.open_questions.filter(q => q.blocking);
  if (blocking.length) {
    out.push('## Resolve before go-live');
    for (const q of blocking) out.push(`- **${openQuestionText(q).ask}** Until resolved: ${midSentence(q.assumption)}.`);
    out.push('');
  }

  out.push('## EU AI Act classification');
  out.push(`- **Status:** ${statusLabel(r)}${r.provisional ? ' (provisional)' : ''}`);
  const bases = basesLabels(r);
  if (bases.length) out.push(`- **Basis:** ${bases.join('; ')}`);
  out.push(`- **Scope:** ${scopeLabel(r.scope)}`);
  out.push(`- **Your role:** ${r.roles.length ? r.roles.map(roleLabel).join(', ') : 'None under the EU AI Act'}`);
  const dates = keyDates(r);
  if (dates.length) {
    out.push('- **Key dates:**');
    for (const d of dates) out.push(`  - ${d.label}: ${d.refs.join(', ')}`);
  }
  out.push('');
  out.push('### Because');
  for (const t of r.trace) out.push(`- ${t.rule} (${t.because.join('; ')})`);
  out.push('');

  out.push(`## Governance tier: ${model.tier === 'P' ? 'P' : model.tier} (${tier.name})`);
  out.push(tier.summary || '');
  for (const t of tierExpectations(model.tier)) {
    out.push(`\n**Tier ${t.tier} (${t.name})**`);
    for (const e of t.items) out.push(`- ${e}`);
  }
  out.push('');

  out.push('## First actions');
  if (model.first_actions.derived) out.push('_Derived from the open questions and the governance tier._');
  for (const a of model.first_actions.items) out.push(`${a.rank}. **${a.title}**${a.why ? ` ${a.why}` : ''}`);
  out.push('');

  if (model.requirements) {
    out.push('## Requirements by gate');
    for (const g of requirementsByGate(r)) {
      out.push(`### ${g.label}`);
      for (const q of g.items) {
        const src = (q.sources || []).map(s => `${s.framework} ${s.ref}`).join('; ');
        out.push(`- **${q.title}** (${q.level === 'org' ? 'organisation' : 'use case'})${q.summary ? `: ${q.summary}` : ''}`);
        if (q.why) out.push(`  - Why: ${q.why}`);
        if (q.artefact) out.push(`  - Artefact: ${q.artefact}`);
        if (src) out.push(`  - Sources: ${src}`);
        if (q.effective_from) out.push(`  - Applies from: ${formatDate(q.effective_from)}`);
      }
    }
  } else {
    out.push('## EU AI Act obligations by role');
    const groups = obligationsByRole(r);
    if (!groups.length) out.push('None for your role.');
    for (const g of groups) {
      out.push(`### ${g.label}`);
      for (const o of g.items) out.push(`- **${o.citation}** ${o.title}${o.effective_from ? ` (from ${formatDate(o.effective_from)})` : ''}`);
    }
  }
  out.push('');

  if (model.open_questions.length) {
    out.push('## Open questions to escalate');
    for (const q of model.open_questions) {
      const t = openQuestionText(q);
      out.push(`- **${t.ask}** Ask: ${t.who}. Assumed meanwhile: ${midSentence(q.assumption)}.${q.blocking ? ' **Blocking.**' : ''}`);
    }
    out.push('');
  }
  if (model.notes.length) {
    out.push('## Notes');
    for (const n of model.notes) out.push(`- **${n.ref}:** ${n.text}`);
    out.push('');
  }
  out.push('## Your answers');
  out.push(...answerLines(model.answers));
  out.push('');
  return out.join('\n');
}

export function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = ['record_type', 'id', 'title', 'gate', 'level', 'roles_or_owners', 'sources', 'effective_from', 'artefact', 'effort', 'blocking', 'detail'];

export function toCsv(model, result) {
  const rows = [CSV_COLUMNS];
  if (model.requirements) {
    for (const q of model.requirements) {
      rows.push(['requirement', q.id, q.title, q.gate, q.level, (q.owners || []).join('; '),
        (q.sources || []).map(s => `${s.framework} ${s.ref}`).join('; '), q.effective_from || '',
        q.artefact || '', q.effort || '', '', q.why || q.summary || '']);
    }
  } else {
    // One row per obligation, listing every role of yours that holds it.
    const byId = new Map();
    for (const g of obligationsByRole(result)) {
      for (const o of g.items) {
        if (!byId.has(o.id)) byId.set(o.id, { o, roles: [] });
        byId.get(o.id).roles.push(g.label);
      }
    }
    for (const { o, roles } of byId.values()) {
      rows.push(['eu_obligation', o.id, o.title, '', 'use_case', roles.join('; '), `EU AI Act ${o.citation}`, o.effective_from || '', '', '', '', '']);
    }
  }
  for (const q of model.open_questions) {
    const t = openQuestionText(q);
    rows.push(['open_question', q.gate, t.ask, '', '', t.who, '', '', '', '', q.blocking ? 'yes' : 'no', q.assumption]);
  }
  return rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
