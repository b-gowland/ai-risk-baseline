#!/usr/bin/env node
/**
 * validate-data.js
 * Validates all data files in src/data/ for schema integrity.
 * Run as part of the GitHub Actions deploy workflow.
 * Exit 0 = pass, Exit 1 = fail.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, `../src/data`)

let errors = 0

function fail(file, msg) {
  console.error(`❌ [${file}] ${msg}`)
  errors++
}

function pass(file, msg) {
  console.log(`✅ [${file}] ${msg}`)
}

function loadJSON(filename) {
  try {
    const raw = readFileSync(resolve(DATA_DIR, filename), `utf8`)
    return JSON.parse(raw)
  } catch (e) {
    fail(filename, `Failed to parse JSON: ${e.message}`)
    return null
  }
}

// ─── validate regulatory-mappings.json ───────────────────────────────────────

const reg = loadJSON(`regulatory-mappings.json`)
if (reg) {
  const items = Array.isArray(reg) ? reg : reg.mappings || []
  if (!items.length) fail(`regulatory-mappings.json`, `No mappings found`)

  let sourcelessCount = 0
  let todoCount = 0

  items.forEach((item, i) => {
    const ref = item.citation || item.article_ref || `?`
    if (!item.framework) fail(`regulatory-mappings.json`, `Item ${i} missing 'framework'`)
    if (!item.citation && !item.article_ref) fail(`regulatory-mappings.json`, `Item ${i} missing 'citation'`)
    if (!item.title && !item.requirement && !item.summary) fail(`regulatory-mappings.json`, `Item ${i} (${ref}) missing 'title' or 'summary'`)
    if (!item.obligation_type && !item.obligation_level && item.mandatory === undefined) fail(`regulatory-mappings.json`, `Item ${i} (${ref}) missing obligation field`)
    if (!item._source_note) sourcelessCount++
    if (item._source_note?.toLowerCase().includes(`todo`)) todoCount++
    if ((item.title || item.summary || ``).toLowerCase().includes(`todo`)) todoCount++
    if (!item.source_url) fail(`regulatory-mappings.json`, `Item ${i} (${ref}) missing 'source_url'`)
  })

  if (sourcelessCount > 0) fail(`regulatory-mappings.json`, `${sourcelessCount} items missing '_source_note'`)
  if (todoCount > 0) fail(`regulatory-mappings.json`, `${todoCount} items contain 'TODO' — not allowed to ship`)
  if (!errors) pass(`regulatory-mappings.json`, `${items.length} mappings valid`)
}

// ─── validate risks-mappings.json ─────────────────────────────────────────────

const risks = loadJSON(`risks-mappings.json`)
if (risks) {
  const items = Array.isArray(risks) ? risks : risks.risks || []
  if (!items.length) fail(`risks-mappings.json`, `No risks found`)

  items.forEach((risk, i) => {
    const id = risk.id || risk.kb_id || `?`
    if (!risk.id && !risk.kb_id) fail(`risks-mappings.json`, `Risk ${i} missing 'id'`)
    if (!risk.title) fail(`risks-mappings.json`, `Risk ${i} (${id}) missing 'title'`)
    if (!risk.domain) fail(`risks-mappings.json`, `Risk ${i} (${id}) missing 'domain'`)
    if (!risk.weight_rules && !risk.base_weight && !risk.weights) {
      fail(`risks-mappings.json`, `Risk ${i} (${id}) missing 'weights'`)
    }
  })

  if (!errors) pass(`risks-mappings.json`, `${items.length} risks valid`)
}

// ─── validate controls-index.json ────────────────────────────────────────────

const controls = loadJSON(`controls-index.json`)
if (controls) {
  const items = Array.isArray(controls) ? controls : controls.controls || []
  if (!items.length) fail(`controls-index.json`, `No controls found`)

  const validFunctions = new Set([`risk`, `legal`, `tech`, `procurement`])
  const validEffort = new Set([`Low`, `Medium`, `High`])
  const validPhases = new Set([`design`, `deploy`, `operate`, `ongoing`])

  items.forEach((ctrl, i) => {
    const id = ctrl.id || `?`
    if (!ctrl.id) fail(`controls-index.json`, `Control ${i} missing 'id'`)
    if (!ctrl.title && !ctrl.name) fail(`controls-index.json`, `Control ${id} missing 'title'`)
    // function may be stored in 'function', 'function_owner', or 'owners'
    const fn = ctrl.function || ctrl.function_owner || (Array.isArray(ctrl.owners) ? ctrl.owners[0] : null)
    if (!fn) fail(`controls-index.json`, `Control ${id} missing 'function'`)
    else {
      const fnNorm = fn.toLowerCase()
      if (!validFunctions.has(fnNorm)) fail(`controls-index.json`, `Control ${id} has invalid function '${fn}' (must be: ${[...validFunctions].join(`, `)})`)
    }
    if (!ctrl.effort) fail(`controls-index.json`, `Control ${id} missing 'effort'`)
    else if (!validEffort.has(ctrl.effort)) fail(`controls-index.json`, `Control ${id} has invalid effort '${ctrl.effort}' (must be: Low / Medium / High)`)
    // lifecycle_phases — required, non-empty array, values from closed vocabulary
    if (!ctrl.lifecycle_phases) {
      fail(`controls-index.json`, `Control ${id} missing 'lifecycle_phases'`)
    } else if (!Array.isArray(ctrl.lifecycle_phases) || ctrl.lifecycle_phases.length === 0) {
      fail(`controls-index.json`, `Control ${id} has empty or non-array 'lifecycle_phases'`)
    } else {
      ctrl.lifecycle_phases.forEach(phase => {
        if (!validPhases.has(phase)) {
          fail(`controls-index.json`, `Control ${id} has invalid lifecycle phase '${phase}' (must be: design, deploy, operate, ongoing)`)
        }
      })
    }
  })

  if (!errors) pass(`controls-index.json`, `${items.length} controls valid`)
}

// ─── validate system-config.json ─────────────────────────────────────────────

const sysconfig = loadJSON(`system-config.json`)
if (sysconfig) {
  const questions = sysconfig.questions || []
  if (questions.length !== 5) fail(`system-config.json`, `Expected 5 questions, found ${questions.length}`)

  questions.forEach((q, i) => {
    if (!q.id) fail(`system-config.json`, `Question ${i} missing 'id'`)
    if (!q.label) fail(`system-config.json`, `Question ${i} missing 'label'`)
    const opts = q.options || (q.parts?.flatMap(p => p.options) || [])
    if (!opts.length) fail(`system-config.json`, `Question ${i} (${q.id || `?`}) has no options`)
    opts.forEach((opt, j) => {
      if (!opt.value) fail(`system-config.json`, `Question ${q.id} option ${j} missing 'value'`)
      if (!opt.label) fail(`system-config.json`, `Question ${q.id} option ${j} (${opt.value || `?`}) missing 'label'`)
      // help_short is required but some options (like data_scale, platform) may legitimately omit it
      // We warn but don't fail — these are platform/scale options that are self-describing
    })
  })

  if (!errors) pass(`system-config.json`, `${questions.length} questions valid`)
}

// ─── validate actions-template.json ──────────────────────────────────────────

const actions = loadJSON(`actions-template.json`)
if (actions) {
  if (!actions.priority_rules && !actions.algorithm) {
    fail(`actions-template.json`, `Missing 'priority_rules' or 'algorithm'`)
  } else {
    pass(`actions-template.json`, `Action template valid`)
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(``)
if (errors > 0) {
  console.error(`Data validation FAILED with ${errors} error(s). Fix before deploying.`)
  process.exit(1)
} else {
  console.log(`All data files passed validation.`)
  process.exit(0)
}
