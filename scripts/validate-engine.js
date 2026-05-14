// scripts/validate-engine.js
// Engine QA script — validates controls and risks output for known configurations.
// Run: node scripts/validate-engine.js
// Exit code 0 = all assertions pass. Exit code 1 = failures (printed to stdout).
//
// Spec: BASELINE_REFERENCE.md Part 13
// Updated: May 14, 2026 — Opus design review (v1.5)

import { buildOutput } from '../src/engine/baseline.js';
import { readFile } from 'fs/promises';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function assertIncludes(label, arr, id) {
  assert(label, arr.some(item => item.id === id || item.kb_id === id),
    `Expected ${id} — got [${arr.map(i => i.id || i.kb_id).join(', ')}]`);
}

function assertExcludes(label, arr, id) {
  assert(label, !arr.some(item => item.id === id || item.kb_id === id),
    `Unexpectedly found ${id}`);
}

// ── Test configs ──────────────────────────────────────────────────
// Note: system_type is a string in production config; the predicate engine handles
// both string and array via array-intersection check. Test configs use arrays
// per spec (TC_A has predictive+automated_decision multi-type).
// data.data_type uses system-config.json enum values (personal_basic, personal_financial, etc.)

const TC_A = {  // Predictive · FS · EU+AU · personal+financial · customer-facing
  system_type: ['predictive', 'automated_decision'],
  context: { domain: 'financial_services', who: 'customer_facing', decision_mode: 'automated' },
  jurisdiction: ['eu', 'au'],
  data: { data_type: ['personal_basic', 'personal_financial'], data_scale: '10k_100k' },
};

const TC_B = {  // Agentic · FS · AU · personal+financial · customer-facing
  system_type: 'agentic',
  context: { domain: 'financial_services', who: 'customer_facing' },
  jurisdiction: ['au'],
  data: { data_type: ['personal_basic', 'personal_financial'], data_scale: '10k_100k' },
};

const TC_C = {  // LLM chatbot · healthcare · AU · health data · customer-facing
  system_type: 'llm_chatbot',
  context: { domain: 'healthcare', who: 'customer_facing' },
  jurisdiction: ['au'],
  data: { data_type: ['personal_health'], data_scale: '1k_10k' },
};

const TC_D = {  // Automated decision · HR · EU · personal · internal-facing
  system_type: 'automated_decision',
  context: { domain: 'hr_employment', who: 'internal_facing' },
  jurisdiction: ['eu'],
  data: { data_type: ['personal_basic'], data_scale: '1k_10k' },
};

const TC_E = {  // Generative content · general · AU · no personal data · internal
  system_type: 'generative_content',
  context: { domain: 'general', who: 'internal_facing' },
  jurisdiction: ['au'],
  data: { data_type: ['no_personal'], data_scale: 'under_1k' },
};

const TC_F = {  // Minimal / don't know
  system_type: '',
  context: { domain: 'general', who: '' },
  jurisdiction: [],
  data: { data_type: [], data_scale: 'unknown' },
};

const TC_G = {  // AU only, low-risk
  system_type: 'predictive',
  context: { domain: 'general', who: 'internal_facing' },
  jurisdiction: ['au'],
  data: { data_type: ['no_personal'], data_scale: 'under_1k' },
};

const TC_H = {  // EU only, high-risk, agentic
  system_type: ['agentic', 'automated_decision'],
  context: { domain: 'financial_services', who: 'customer_facing' },
  jurisdiction: ['eu'],
  data: { data_type: ['personal_basic', 'personal_financial'], data_scale: '100k_plus' },
};

// ── Test suite ────────────────────────────────────────────────────

console.log('\n=== TC-A: Predictive · FS · EU+AU ===');
{
  const out = buildOutput(TC_A);
  // Risks — expected high scorers for this config
  assertIncludes('TC-A-R1: E1 (Algorithmic Bias) present', out.risks, 'e1');
  assertIncludes('TC-A-R2: A4 (Explainability) present', out.risks, 'a4');
  assertIncludes('TC-A-R3: B1 (Accountability) present', out.risks, 'b1');
  assertIncludes('TC-A-R4: D1 (Training Data Quality) present', out.risks, 'd1');
  assert('TC-A-R5: At least 5 risks returned', out.risks.length >= 5,
    `Got ${out.risks.length}`);
  // Controls — regulatory-driven for EU+AU FS
  assertIncludes('TC-A-C1: Fundamental rights impact assessment present', out.controls, 'c_fundamental_rights_iaa');
  assert('TC-A-C2: At least 8 controls returned', out.controls.length >= 8,
    `Got ${out.controls.length}`);
  // Regulatory
  assert('TC-A-Reg1: EU AI Act items present', out.regulatory.some(r => r.framework === 'eu_ai_act'),
    `Frameworks: [${out.regulatory.map(r => r.framework).join(', ')}]`);
}

console.log('\n=== TC-B: Agentic · FS · AU ===');
{
  const out = buildOutput(TC_B);
  // CRITICAL: agentic-specific risks must surface
  assertIncludes('TC-B-R1: G5 (Excessive Agency) present', out.risks, 'g5');
  assertIncludes('TC-B-R2: C2 (Prompt Injection) present', out.risks, 'c2');
  assertIncludes('TC-B-R3: B5 (Agentic Logging) present', out.risks, 'b5');
  assert('TC-B-R4: At least 5 risks returned for agentic config', out.risks.length >= 5,
    `Got ${out.risks.length} — possible agentic weight gap in risks-mappings.json`);
  // CRITICAL: agentic-specific controls must surface
  assertIncludes('TC-B-C1: Human-in-the-loop control present', out.controls, 'c_human_in_loop');
  assertIncludes('TC-B-C2: Action logging / auditability control present', out.controls, 'c_agentic_audit_log');
  assertIncludes('TC-B-C3: Scope limitation / tool restriction control present', out.controls, 'c_agentic_scope_limit');
  assert('TC-B-C4: At least 6 controls returned for agentic config', out.controls.length >= 6,
    `Got ${out.controls.length} — check system_type: ["agentic"] on controls-index.json entries`);
  // Agentic AU only — EU AI Act should NOT appear
  assert('TC-B-Reg1: EU AI Act NOT present (AU only)',
    !out.regulatory.some(r => r.framework === 'eu_ai_act'),
    `EU AI Act items unexpectedly present: [${out.regulatory.filter(r => r.framework === 'eu_ai_act').map(r => r.id).join(', ')}]`);
}

console.log('\n=== TC-C: LLM chatbot · Healthcare · AU ===');
{
  const out = buildOutput(TC_C);
  assertIncludes('TC-C-R1: A1 (Hallucination) present', out.risks, 'a1');
  assertIncludes('TC-C-R2: D2 (Privacy / PII Exposure) present', out.risks, 'd2');
  assertIncludes('TC-C-R3: F1 (Automation Bias) present', out.risks, 'f1');
  assert('TC-C-C1: At least 5 controls returned', out.controls.length >= 5,
    `Got ${out.controls.length}`);
}

console.log('\n=== TC-D: Automated decision · HR · EU ===');
{
  const out = buildOutput(TC_D);
  assertIncludes('TC-D-R1: E1 (Algorithmic Bias) present', out.risks, 'e1');
  assertIncludes('TC-D-R2: A4 (Explainability) present', out.risks, 'a4');
  assert('TC-D-Reg1: EU AI Act present', out.regulatory.some(r => r.framework === 'eu_ai_act'),
    `Frameworks: [${out.regulatory.map(r => r.framework).join(', ')}]`);
  assert('TC-D-C1: At least 4 controls returned', out.controls.length >= 4,
    `Got ${out.controls.length}`);
}

console.log('\n=== TC-E: Generative content · General · AU · no personal data ===');
{
  const out = buildOutput(TC_E);
  assertIncludes('TC-E-R1: A1 (Hallucination) present', out.risks, 'a1');
  assertIncludes('TC-E-R2: E2 (Harmful Content) present', out.risks, 'e2');
  assertIncludes('TC-E-R3: D3 (IP/Copyright Risk) present', out.risks, 'd3');
  assert('TC-E-C1: At least 3 controls returned', out.controls.length >= 3,
    `Got ${out.controls.length}`);
}

console.log('\n=== TC-F: Minimal / don\'t know ===');
{
  const out = buildOutput(TC_F);
  assert('TC-F-smoke: Controls count > 0 (fallback behaviour)', out.controls.length > 0,
    `Got ${out.controls.length} — check fallback predicate handling`);
  assert('TC-F-smoke: Risks count > 0', out.risks.length > 0,
    `Got ${out.risks.length}`);
}

console.log('\n=== TC-G: AU only, low-risk ===');
{
  const out = buildOutput(TC_G);
  assert('TC-G-smoke: Controls returned', out.controls.length > 0,
    `Got ${out.controls.length}`);
  assert('TC-G: EU AI Act NOT present (AU only)',
    !out.regulatory.some(r => r.framework === 'eu_ai_act'),
    `EU AI Act items unexpectedly present`);
}

console.log('\n=== TC-H: EU only, high-risk, agentic ===');
{
  const out = buildOutput(TC_H);
  assertIncludes('TC-H-R1: G5 (Excessive Agency) present', out.risks, 'g5');
  assert('TC-H-Reg1: EU AI Act present', out.regulatory.some(r => r.framework === 'eu_ai_act'),
    `Frameworks: [${out.regulatory.map(r => r.framework).join(', ')}]`);
  assert('TC-H-C1: At least 10 controls returned (dense config)', out.controls.length >= 10,
    `Got ${out.controls.length}`);
}

// ── Data integrity checks (run regardless of config) ──────────────

console.log('\n=== Data integrity checks ===');
{
  const CONTROLS = JSON.parse(
    await readFile(new URL('../src/data/controls-index.json', import.meta.url), 'utf8')
  );
  const RISKS = JSON.parse(
    await readFile(new URL('../src/data/risks-mappings.json', import.meta.url), 'utf8')
  );

  const validRiskIds = new Set(RISKS.risks.map(r => r.kb_id));

  // Import the normaliser from the engine to assert with the same logic the UI uses.
  const { kbIdFromRef } = await import('../src/engine/baseline.js');

  // TC-08: Every control kb_ref normalises to a kb_id that exists in risks-mappings.json.
  // (Revised May 14 — Opus review. Uses kbIdFromRef normaliser, not raw string comparison.)
  for (const control of CONTROLS.controls) {
    for (const ref of (control.kb_refs || [])) {
      const normalised = kbIdFromRef(ref);
      assert(
        `TC-08: Control ${control.id} kb_ref "${ref}" → "${normalised}" exists in risks-mappings.json`,
        validRiskIds.has(normalised),
        `Normalised "${normalised}" not found in risks-mappings.json — phantom edge would render in map`
      );
    }
  }

  // TC-09: All controls have lifecycle_phases set (required for Map tab roadmap)
  for (const control of CONTROLS.controls) {
    assert(
      `TC-09: Control ${control.id} has lifecycle_phases`,
      Array.isArray(control.lifecycle_phases) && control.lifecycle_phases.length > 0,
      `Missing lifecycle_phases — control will not appear in Roadmap`
    );
  }

  // TC-10: No control has a system_type predicate that can never match
  const VALID_SYSTEM_TYPES = new Set([
    'predictive', 'automated_decision', 'llm_chatbot', 'agentic',
    'generative_content', 'recommendation', 'computer_vision',
  ]);
  for (const control of CONTROLS.controls) {
    const sysTypePreds = extractSystemTypeValues(control.applies_when);
    for (const val of sysTypePreds) {
      assert(
        `TC-10: Control ${control.id} system_type value "${val}" is a known enum`,
        VALID_SYSTEM_TYPES.has(val),
        `Unknown value — control will never match`
      );
    }
  }

  // TC-11: Risks count = 32 (no phantom or missing entries)
  assert(`TC-11: risks-mappings.json has 32 entries`, RISKS.risks.length === 32,
    `Got ${RISKS.risks.length}`);

  // TC-12: Controls count matches expected (warn if significantly off)
  assert(`TC-12: controls-index.json has at least 25 entries`, CONTROLS.controls.length >= 25,
    `Got ${CONTROLS.controls.length} — possible data truncation`);

  // TC-13: kbIdFromRef() normaliser — three assertions (added May 14 — Opus review).
  // These catch regressions that would silently empty the Risks+Controls panel.
  assert(`TC-13a: kbIdFromRef full path → short id`,
    kbIdFromRef('domain-e-quality-and-integrity/e1-algorithmic-bias') === 'e1',
    `Got "${kbIdFromRef('domain-e-quality-and-integrity/e1-algorithmic-bias')}"`);
  assert(`TC-13b: kbIdFromRef short id → same short id`,
    kbIdFromRef('e1') === 'e1',
    `Got "${kbIdFromRef('e1')}"`);
  assert(`TC-13c: kbIdFromRef null/empty → empty string (no throw)`,
    kbIdFromRef('') === '' && kbIdFromRef(null) === '' && kbIdFromRef(undefined) === '',
    `One of empty/null/undefined inputs threw or returned non-empty`);
}

// ── Summary ───────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\nFAILED — fix data files before distributing.`);
  process.exit(1);
} else {
  console.log(`\nALL PASS — engine output validated.`);
  process.exit(0);
}

// ── Helper ────────────────────────────────────────────────────────

function extractSystemTypeValues(predicate) {
  if (!predicate) return [];
  if (predicate.all) return predicate.all.flatMap(extractSystemTypeValues);
  if (predicate.any) return predicate.any.flatMap(extractSystemTypeValues);
  if (predicate.system_type) return predicate.system_type;
  return [];
}
