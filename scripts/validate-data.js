#!/usr/bin/env node
/**
 * validate-data.js
 * Validates the site data (src/data) and the v2 data files (src/v2/data) for integrity:
 * parseable JSON, unique ids, resolvable cross-references, sources and freshness.
 * Deeper rule checks live in the test suite (golden-v2, classify-v2, requirements-v2).
 * Run as part of the deploy and validate workflows. Exit 0 = pass, Exit 1 = fail.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), `..`)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000

let errors = 0

function fail(file, msg) {
  console.error(`❌ [${file}] ${msg}`)
  errors++
}

function pass(file, msg) {
  console.log(`✅ [${file}] ${msg}`)
}

function loadJSON(file) {
  try {
    const raw = readFileSync(resolve(ROOT, file), `utf8`)
    if (raw.includes(`TODO`)) fail(file, `Contains 'TODO': not allowed to ship`)
    return JSON.parse(raw)
  } catch (e) {
    fail(file, `Failed to parse JSON: ${e.message}`)
    return null
  }
}

function checkUnique(file, ids) {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (dupes.length) fail(file, `Duplicate ids: ${[...new Set(dupes)].join(`, `)}`)
}

// Warn (not fail) when a source was last verified more than 12 months ago.
function checkFresh(file, id, lastVerified) {
  if (!lastVerified || !ISO_DATE.test(lastVerified)) return fail(file, `${id}: missing or invalid 'last_verified'`)
  if (Date.now() - new Date(lastVerified).getTime() > TWELVE_MONTHS_MS) {
    console.warn(`⚠️  [${file}] ${id}: last_verified is over 12 months old (${lastVerified}); review for freshness`)
  }
}

// ─── site data ───────────────────────────────────────────────────────────────

const changelog = loadJSON(`src/data/changelog.json`)
if (changelog) {
  if (!Array.isArray(changelog.entries)) fail(`changelog.json`, `Missing or non-array 'entries' field`)
  else pass(`changelog.json`, `${changelog.entries.length} changelog entries valid`)
}

const siteVer = loadJSON(`src/data/site-version.json`)
if (siteVer) {
  const before = errors
  for (const k of [`version`, `verified_month`, `verified_date`]) {
    if (!siteVer[k]) fail(`site-version.json`, `Missing '${k}' field`)
  }
  if (errors === before) pass(`site-version.json`, `Site version valid (v${siteVer.version}, ${siteVer.verified_month})`)
}

// ─── v2 data ─────────────────────────────────────────────────────────────────

for (const f of [`answer-model`, `purposes`, `prohibited-practices`, `tier-matrix`]) {
  if (loadJSON(`src/v2/data/${f}.json`)) pass(`${f}.json`, `Parses`)
}

const OBL = `eu-obligations.json`
const obligations = loadJSON(`src/v2/data/${OBL}`)
const obligationIds = new Set()
if (obligations) {
  const before = errors
  const items = obligations.obligations || []
  checkUnique(OBL, items.map(o => o.id))
  for (const o of items) {
    obligationIds.add(o.id)
    if (!o.citation || !o.title) fail(OBL, `${o.id}: missing 'citation' or 'title'`)
    if (!Array.isArray(o.role) || !o.role.length) fail(OBL, `${o.id}: missing 'role'`)
    const d = o.effective_from
    if (!(ISO_DATE.test(d || ``) || d === `basis` || obligations.dates?.[d])) fail(OBL, `${o.id}: invalid 'effective_from' ${d}`)
  }
  if (errors === before) pass(OBL, `${items.length} obligations valid`)
}

const REQ = `requirements.json`
const requirements = loadJSON(`src/v2/data/${REQ}`)
if (requirements) {
  const before = errors
  const frameworks = requirements.frameworks || {}
  for (const [id, fw] of Object.entries(frameworks)) {
    if (!fw.url) fail(REQ, `Framework '${id}' missing 'url'`)
    checkFresh(REQ, `Framework '${id}'`, fw.last_verified)
  }
  const items = requirements.requirements || []
  checkUnique(REQ, items.map(r => r.id))
  const covered = new Set()
  for (const r of items) {
    for (const k of [`title`, `summary`, `level`, `gate`, `artefact`, `effort`]) {
      if (!r[k]) fail(REQ, `${r.id}: missing '${k}'`)
    }
    if (!r.sources?.length) fail(REQ, `${r.id}: no sources`)
    for (const s of r.sources || []) {
      if (!frameworks[s.framework]) fail(REQ, `${r.id}: unknown framework '${s.framework}'`)
      // Frameworks with verified titles (the paywalled ISO/IEC standards) may only cite verified refs.
      const titles = frameworks[s.framework]?.ref_titles
      if (titles && !titles[s.ref]) fail(REQ, `${r.id}: ${s.framework} ${s.ref} has no verified title in ref_titles`)
      if (s.obligation) {
        if (!obligationIds.has(s.obligation)) fail(REQ, `${r.id}: unknown obligation '${s.obligation}'`)
        covered.add(s.obligation)
      }
    }
  }
  const uncovered = [...obligationIds].filter(id => !covered.has(id))
  if (uncovered.length) fail(REQ, `EU obligations not covered by any requirement: ${uncovered.join(`, `)}`)
  if (errors === before) pass(REQ, `${items.length} requirements valid; all ${obligationIds.size} EU obligations covered`)
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
