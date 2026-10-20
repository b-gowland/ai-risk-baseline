// Unit tests for the v2 exports (src/v2/ui/export.js): versioned JSON, Markdown and CSV.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportModel, toMarkdown, toCsv, csvCell, CSV_COLUMNS, EXPORT_SCHEMA_VERSION } from '../../src/v2/ui/export.js';
import { classify } from '../../src/v2/engine/classify.js';
import SUITE from '../../src/v2/golden/scenarios.json' with { type: 'json' };

const today = '2026-10-20';
const scenario = id => SUITE.scenarios.find(s => s.id === id);
const build = (id, extra = {}) => {
  const answers = { ...SUITE.defaults, ...scenario(id).answers };
  const result = { ...classify(answers, { today }), ...extra };
  const model = buildExportModel({ answers, name: 'Test, "quoted"', result, url: 'https://example.test/v2/output?v=2', generatedAt: '2026-10-20T00:00:00.000Z' });
  return { answers, result, model };
};

// Split CSV text into rows of cells (RFC 4180 subset: quoted cells may hold , " and newlines).
function parseCsv(text) {
  const rows = [[]];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { rows.at(-1).push(cell); cell = ''; }
    else if (c === '\r' && text[i + 1] === '\n') { rows.at(-1).push(cell); cell = ''; rows.push([]); i++; }
    else cell += c;
  }
  if (rows.at(-1).length === 0 && cell === '') rows.pop();
  return rows;
}

// The UI falls back to obligations and derived actions when the engine returns no requirements.
const WITHOUT_REQUIREMENTS = { requirements: undefined, actions: undefined };

test('JSON export is versioned and JSON-safe', () => {
  const { model } = build('G09');
  assert.equal(model.schema_version, EXPORT_SCHEMA_VERSION);
  assert.ok(model.schema);
  assert.deepEqual(JSON.parse(JSON.stringify(model)), model);
  assert.equal(model.classification.status, 'high_risk');
  assert.ok(model.requirements.length > 0);
  assert.equal(model.first_actions.derived, false);
  assert.ok(model.first_actions.items.length <= 5);
});

test('JSON export without requirements falls back to derived actions', () => {
  const { model } = build('G09', WITHOUT_REQUIREMENTS);
  assert.equal(model.requirements, null);
  assert.equal(model.first_actions.derived, true);
  assert.ok(model.first_actions.items.length <= 5);
});

for (const id of SUITE.scenarios.map(s => s.id)) {
  test(`${id}: Markdown and CSV render`, () => {
    const { model, result } = build(id);
    const md = toMarkdown(model, result);
    assert.match(md, /not legal advice/);
    assert.match(md, /## EU AI Act classification/);
    const rows = parseCsv(toCsv(model, result));
    assert.deepEqual(rows[0], CSV_COLUMNS);
    for (const r of rows) assert.equal(r.length, CSV_COLUMNS.length);
    const oq = rows.filter(r => r[0] === 'open_question').length;
    assert.equal(oq, result.open_questions.length);
  });
}

test('CSV lists each obligation once, with all its holder roles', () => {
  const { model, result } = build('G09', WITHOUT_REQUIREMENTS);
  const rows = parseCsv(toCsv(model, result)).filter(r => r[0] === 'eu_obligation');
  assert.equal(rows.length, result.obligations.length);
  assert.equal(rows.find(r => r[1] === 'eu.art_4')[5], 'Provider; Deployer');
});

test('requirements replace obligations in CSV and Markdown when present', () => {
  const req = { id: 'req.inventory', title: 'Inventory entry', summary: 's', level: 'org', gate: 'classify', sources: [{ framework: 'ISO/IEC 42001', ref: 'A.4' }], artefact: 'Inventory record', owners: ['AI lead'], effort: 'low', effective_from: null, why: 'Always' };
  const { model, result } = build('G10', { requirements: [req], actions: [{ rank: 1, requirement_id: req.id, title: req.title, why: 'first' }] });
  const rows = parseCsv(toCsv(model, result));
  assert.deepEqual(rows[1], ['requirement', 'req.inventory', 'Inventory entry', 'classify', 'org', 'AI lead', 'ISO/IEC 42001 A.4', '', 'Inventory record', 'low', '', 'Always']);
  const md = toMarkdown(model, result);
  assert.match(md, /## Requirements by gate/);
  assert.match(md, /### Classify/);
  assert.equal(model.first_actions.derived, false);
});

test('csvCell quotes only when needed', () => {
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(null), '');
});

test('country packs get their own Markdown section and CSV record type', () => {
  const answers = { ...SUITE.defaults, ...scenario('G09').answers, other_jurisdictions: ['uk', 'au'] };
  const result = classify(answers, { today });
  const model = buildExportModel({ answers, name: 'Packs', result, url: 'https://example.test/output?v=2', generatedAt: '2026-10-20T00:00:00.000Z' });
  const md = toMarkdown(model, result);
  assert.match(md, /## Country packs/);
  for (const heading of ['### GDPR (EU)', '### United Kingdom', '### Australia']) assert.ok(md.includes(heading), heading);
  assert.match(md, /UK GDPR Arts\. 22A-22D/);
  // Core requirements are not repeated under the packs, and pack items not under the core gates.
  const core = md.slice(md.indexOf('## Requirements by gate'), md.indexOf('## Country packs'));
  assert.doesNotMatch(core, /\(GDPR\)|UK GDPR|APP 1\.7/);
  const rows = parseCsv(toCsv(model, result));
  const kinds = new Set(rows.slice(1).map(r => r[0]));
  for (const k of ['requirement', 'pack_requirement:gdpr', 'pack_requirement:uk', 'pack_requirement:au']) assert.ok(kinds.has(k), k);
  for (const r of rows) assert.equal(r.length, CSV_COLUMNS.length);
});
