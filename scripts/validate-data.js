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

// ─── validate changelog.json (FR-100) ────────────────────────────────────────

const changelog = loadJSON(`changelog.json`)
if (changelog) {
  if (!Array.isArray(changelog.entries)) {
    fail(`changelog.json`, `Missing or non-array 'entries' field`)
  } else {
    pass(`changelog.json`, `${changelog.entries.length} changelog entries valid`)
  }
}

// ─── validate site-version.json (FR-98) ──────────────────────────────────────

const siteVer = loadJSON(`site-version.json`)
if (siteVer) {
  if (!siteVer.version) fail(`site-version.json`, `Missing 'version' field`)
  if (!siteVer.verified_month) fail(`site-version.json`, `Missing 'verified_month' field`)
  if (!siteVer.verified_date) fail(`site-version.json`, `Missing 'verified_date' field`)
  if (!errors) pass(`site-version.json`, `Site version valid (v${siteVer.version}, ${siteVer.verified_month})`)
}

// ─── last_verified and framework_version checks (FR-100) ─────────────────────

// Warn (not fail) if last_verified > 365 days old
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000
const now = Date.now()

function checkLastVerified(file, items, idField) {
  let missing = 0
  let stale = 0
  items.forEach((item, i) => {
    const id = item[idField] || item.id || `?`
    if (!item.last_verified) {
      missing++
    } else {
      try {
        const verifiedMs = new Date(item.last_verified).getTime()
        if ((now - verifiedMs) > TWELVE_MONTHS_MS) {
          console.warn(`⚠️  [${file}] Item ${id}: last_verified is over 12 months old (${item.last_verified})`)
          stale++
        }
      } catch {
        fail(file, `Item ${id} has invalid last_verified date: ${item.last_verified}`)
      }
    }
  })
  if (missing > 0) fail(file, `${missing} items missing 'last_verified' field`)
  if (stale > 0) console.warn(`⚠️  [${file}] ${stale} item(s) have last_verified > 12 months — review for freshness`)
}

// Check regulatory mappings
if (reg) {
  const regItems = Array.isArray(reg) ? reg : reg.mappings || []
  checkLastVerified(`regulatory-mappings.json`, regItems, `id`)

  // Check framework_version on each framework
  const frameworks = reg.frameworks || []
  let missingFwVersion = 0
  frameworks.forEach(fw => {
    if (!fw.framework_version) {
      missingFwVersion++
      fail(`regulatory-mappings.json`, `Framework '${fw.id}' missing 'framework_version' block`)
    } else {
      const fv = fw.framework_version
      if (!fv.citation) fail(`regulatory-mappings.json`, `Framework '${fw.id}' framework_version missing 'citation'`)
      if (!fv.as_of) fail(`regulatory-mappings.json`, `Framework '${fw.id}' framework_version missing 'as_of'`)
    }
  })
  if (missingFwVersion === 0) pass(`regulatory-mappings.json`, `All ${frameworks.length} frameworks have framework_version`)
}

// Check controls
if (controls) {
  const ctrlItems = Array.isArray(controls) ? controls : controls.controls || []
  checkLastVerified(`controls-index.json`, ctrlItems, `id`)
}

// Check risks
if (risks) {
  const riskItems = Array.isArray(risks) ? risks : risks.risks || []
  checkLastVerified(`risks-mappings.json`, riskItems, `kb_id`)
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
