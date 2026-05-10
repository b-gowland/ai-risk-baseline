/**
 * MapTab.jsx — Phase 2 Visual Map
 *
 * Two-panel layout:
 *   1. ProfileSnapshot — compact config summary chips
 *   2. RoadmapGrid — function × lifecycle-phase matrix of applicable controls
 *
 * Spec: BASELINE_REFERENCE.md Part 11
 * FR-58 to FR-72
 */

import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackEvent, events } from '../utils/analytics.js'
import styles from './MapTab.module.css'

// Phase vocabulary — closed set, order is canonical
const PHASES = [
  { id: `design`,  label: `Design` },
  { id: `deploy`,  label: `Deploy` },
  { id: `operate`, label: `Operate` },
  { id: `ongoing`, label: `Ongoing` },
]

// Function display labels
const FUNCTION_LABELS = {
  risk:        `Risk`,
  legal:       `Legal`,
  tech:        `Technology`,
  procurement: `Procurement`,
}

// Max controls shown per cell before overflow
const CELL_CAP = 4

export default function MapTab({ output, config, editParams }) {
  const navigate = useNavigate()
  const gridRef = useRef(null)

  // Build the function → phase → controls matrix
  const matrix = buildMatrix(output?.controls || [])

  // Functions that have at least one control (FR-60: hide zero-control rows)
  const activeFunctions = Object.keys(FUNCTION_LABELS).filter(fn =>
    Object.values(matrix[fn] || {}).some(cells => cells.length > 0)
  )

  const isBroadConfig = !config?.system_type || config.system_type === `unknown`

  function handleExportSvg() {
    trackEvent(events.MAP_EXPORT, { format: `svg` })
    exportSvg(gridRef)
  }

  function handlePrint() {
    trackEvent(events.MAP_EXPORT, { format: `pdf` })
    window.print()
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
  }

  return (
    <div className={styles.mapRoot}>
      {/* FR-71: broad config banner */}
      {isBroadConfig && (
        <div className={styles.broadBanner}>
          <span>System type unspecified — Map shows broadest applicable controls.</span>
          <a href={`/configure?${editParams?.toString() || ``}`} className={styles.broadLink}>
            Refine →
          </a>
        </div>
      )}

      {/* Panel 1: Profile snapshot */}
      <ProfileSnapshot config={config} controls={output?.controls || []} />

      {/* Panel 2: Governance Roadmap */}
      <section className={styles.roadmapSection} ref={gridRef}>
        <div className={styles.roadmapHeader}>
          <h2 className={styles.roadmapTitle}>Governance Roadmap</h2>
          <p className={styles.roadmapLead}>
            Controls mapped by function and lifecycle phase for this configuration.
          </p>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={styles.legendMandatory} />
            Mandatory
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendRecommended} />
            Recommended
          </span>
        </div>

        {activeFunctions.length === 0 ? (
          <div className={styles.emptyMap}>
            <p>No controls matched this configuration. <a href={`/configure?${editParams?.toString() || ``}`}>Refine your answers →</a></p>
          </div>
        ) : (
          /* Accessible grid */
          <div
            role="grid"
            aria-label="Governance roadmap"
            className={styles.grid}
          >
            {/* Screen-reader summary */}
            <h2 className={styles.srOnly}>
              Governance roadmap. {activeFunctions.length} function rows: {activeFunctions.map(f => FUNCTION_LABELS[f]).join(`, `)}. Four lifecycle phase columns: Design, Deploy, Operate, Ongoing. Each cell lists applicable controls.
            </h2>

            {/* Column headers */}
            <div role="row" className={styles.headerRow}>
              <div role="columnheader" className={styles.fnHeaderCell} />
              {PHASES.map(phase => (
                <div key={phase.id} role="columnheader" className={styles.phaseHeader}>
                  {phase.label}
                </div>
              ))}
            </div>

            {/* Data rows — one per active function */}
            {activeFunctions.map(fn => (
              <RoadmapRow
                key={fn}
                fn={fn}
                matrix={matrix}
                output={output}
                navigate={navigate}
              />
            ))}
          </div>
        )}

        {/* Disclaimer — included in print/SVG export */}
        <p className={styles.disclaimer}>
          This map is a starting point for governance conversations, not legal advice.
          Consult qualified legal and compliance counsel before making compliance decisions.
          Framework citations link to primary sources — verify applicability for your jurisdiction.
        </p>
      </section>

      {/* Export bar — FR-69 */}
      <div className={styles.exportBar}>
        <button className={styles.exportBtn} onClick={handleCopyLink}>Copy link</button>
        <button className={styles.exportBtn} onClick={handleExportSvg}>Export SVG</button>
        <button className={styles.exportBtn} onClick={handlePrint}>Print / PDF</button>
      </div>
    </div>
  )
}

// ─── ProfileSnapshot ──────────────────────────────────────────────────────────

function ProfileSnapshot({ config, controls }) {
  if (!config) return null

  const chips = []
  if (config.system_type && config.system_type !== `unknown`) chips.push({ label: `Type`, value: config.system_type })
  if (config.context?.domain)         chips.push({ label: `Domain`, value: config.context.domain })
  if (config.context?.who)            chips.push({ label: `Users`, value: config.context.who })
  if (config.context?.decision_mode)  chips.push({ label: `Decisions`, value: config.context.decision_mode })
  if (config.jurisdiction?.length)    chips.push({ label: `Jurisdiction`, value: config.jurisdiction.join(` + `) })
  chips.push({ label: `Controls`, value: controls.length })

  return (
    <div className={styles.snapshot}>
      <p className={styles.snapshotEyebrow}>— CONFIGURATION SNAPSHOT</p>
      <div className={styles.snapshotChips}>
        {chips.map((chip, i) => (
          <span key={i} className={styles.snapshotChip}>
            <span className={styles.chipLabel}>{chip.label}</span>
            <span className={styles.chipValue}>{chip.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── RoadmapRow ───────────────────────────────────────────────────────────────

function RoadmapRow({ fn, matrix, output, navigate }) {
  return (
    <div role="row" className={styles.dataRow}>
      <div role="rowheader" className={styles.fnLabelCell}>
        {FUNCTION_LABELS[fn] || fn}
      </div>
      {PHASES.map(phase => (
        <RoadmapCell
          key={phase.id}
          fn={fn}
          phase={phase}
          controls={matrix[fn]?.[phase.id] || []}
          output={output}
          navigate={navigate}
        />
      ))}
    </div>
  )
}

// ─── RoadmapCell ─────────────────────────────────────────────────────────────

function RoadmapCell({ fn, phase, controls, output, navigate }) {
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? controls : controls.slice(0, CELL_CAP)
  const overflow = controls.length - CELL_CAP

  // FR-65: empty cell shows placeholder, doesn't collapse
  if (controls.length === 0) {
    return (
      <div role="gridcell" className={`${styles.cell} ${styles.cellEmpty}`}>
        <span className={styles.emptyCell}>No controls in this phase</span>
      </div>
    )
  }

  return (
    <div role="gridcell" className={styles.cell}>
      {visible.map(ctrl => (
        <ControlCard
          key={ctrl.id}
          ctrl={ctrl}
          output={output}
          navigate={navigate}
        />
      ))}
      {/* FR-64: overflow */}
      {!expanded && overflow > 0 && (
        <button
          className={styles.overflowBtn}
          onClick={() => setExpanded(true)}
        >
          + {overflow} more
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          className={styles.overflowBtn}
          onClick={() => setExpanded(false)}
        >
          Show fewer
        </button>
      )}
    </div>
  )
}

// ─── ControlCard ──────────────────────────────────────────────────────────────

function ControlCard({ ctrl, output, navigate }) {
  const [inlineOpen, setInlineOpen] = useState(false)

  // Determine mandatory status: any framework ref that is mandatory in current output
  const isMandatory = isMandatoryControl(ctrl, output)

  // FR-62: truncate name at 40 chars
  const displayName = ctrl.name?.length > 40
    ? ctrl.name.slice(0, 40) + `…`
    : ctrl.name

  // Primary framework ref
  const primaryFw = ctrl.frameworks?.[0] || ``

  // FR-66: deep-link to controls tab (shift-click or double-click)
  function handleDeepLink(e) {
    if (e.shiftKey || e.detail === 2) {
      trackEvent(events.MAP_CONTROL_CLICKED, { control_id: ctrl.id })
      navigate(`/output?tab=controls#${ctrl.id}`)
    } else {
      setInlineOpen(o => !o)
    }
  }

  function handleKeyDown(e) {
    if (e.key === `Enter`) setInlineOpen(o => !o)
    if (e.key === `Escape`) setInlineOpen(false)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isMandatory ? styles.cardMandatory : styles.cardRecommended}`}
      onClick={handleDeepLink}
      onKeyDown={handleKeyDown}
      aria-expanded={inlineOpen}
      title={`${ctrl.name} — click to expand, shift-click to view full control`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.cardName}>{displayName}</span>
        {isMandatory && <span className={styles.mandatoryPill}>MANDATORY</span>}
      </div>
      {primaryFw && (
        <span className={styles.cardFw}>{formatFrameworkRef(primaryFw)}</span>
      )}

      {/* FR-72: date-aware pill */}
      <DateAwarePill ctrl={ctrl} output={output} />

      {/* Inline expansion */}
      {inlineOpen && (
        <div className={styles.cardExpand}>
          <p className={styles.cardSummary}>{ctrl.summary}</p>
          {ctrl.frameworks?.length > 0 && (
            <div className={styles.cardFrameworks}>
              {ctrl.frameworks.map(fw => (
                <span key={fw} className={styles.fwTag}>{formatFrameworkRef(fw)}</span>
              ))}
            </div>
          )}
          {ctrl.owners?.length > 0 && (
            <p className={styles.cardOwners}>
              Owner: {ctrl.owners.map(o => FUNCTION_LABELS[o] || o).join(` + `)}
            </p>
          )}
          {ctrl.effort && (
            <p className={styles.cardEffort}>Effort: {ctrl.effort}</p>
          )}
          <p className={styles.cardDeepLinkHint}>Shift-click or double-click to view full control →</p>
        </div>
      )}
    </div>
  )
}

// ─── DateAwarePill — FR-72 ────────────────────────────────────────────────────

function DateAwarePill({ ctrl, output }) {
  // Find any regulatory item linked to this control's frameworks that has upcoming date state
  const regs = output?.regulatory || []
  const upcomingReg = regs.find(r =>
    r.date_state === `upcoming` &&
    ctrl.frameworks?.some(fw => r.framework === fw || r.id?.includes(fw))
  )
  if (!upcomingReg || !upcomingReg.effective_from) return null
  const date = new Date(upcomingReg.effective_from)
  const label = `Upcoming ${date.toLocaleDateString(`en-AU`, { day: `numeric`, month: `short`, year: `numeric` })}`
  return <span className={styles.datePill}>{label}</span>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build function → phase → controls matrix from flat controls array.
 * A control can appear in multiple phases (multi-phase assignment is intentional).
 */
function buildMatrix(controls) {
  const matrix = {}
  Object.keys(FUNCTION_LABELS).forEach(fn => {
    matrix[fn] = { design: [], deploy: [], operate: [], ongoing: [] }
  })

  controls.forEach(ctrl => {
    const phases = ctrl.lifecycle_phases || [`ongoing`]
    const owners = ctrl.owners || [`risk`]

    owners.forEach(owner => {
      if (!matrix[owner]) return
      phases.forEach(phase => {
        if (!matrix[owner][phase]) return
        // Avoid duplicates in same cell
        if (!matrix[owner][phase].find(c => c.id === ctrl.id)) {
          matrix[owner][phase].push(ctrl)
        }
      })
    })
  })

  return matrix
}

/**
 * Determine if a control is mandatory based on output regulatory data.
 * A control is mandatory if any of its frameworks appears as mandatory in the
 * current output's regulatory items.
 */
function isMandatoryControl(ctrl, output) {
  if (!output?.regulatory) return false
  const mandatoryFrameworks = new Set(
    output.regulatory
      .filter(r => r.mandatory)
      .map(r => r.framework)
  )
  return ctrl.frameworks?.some(fw => {
    // frameworks on controls are like 'eu_ai_act_art_9'; regulatory framework field is 'eu_ai_act'
    const base = fw.replace(/_art_\d+.*$/, ``).replace(/_art[0-9]+.*$/, ``)
    return mandatoryFrameworks.has(base) || mandatoryFrameworks.has(fw)
  }) || false
}

/**
 * Format a framework ref key into a short human label.
 */
function formatFrameworkRef(fw) {
  const map = {
    eu_ai_act:          `EU AI Act`,
    eu_ai_act_art_9:    `EU AI Act Art. 9`,
    eu_ai_act_art_10:   `EU AI Act Art. 10`,
    eu_ai_act_art_13:   `EU AI Act Art. 13`,
    eu_ai_act_art_14:   `EU AI Act Art. 14`,
    eu_ai_act_art_15:   `EU AI Act Art. 15`,
    eu_ai_act_art_22:   `EU AI Act Art. 22`,
    eu_ai_act_art_26:   `EU AI Act Art. 26`,
    eu_ai_act_art_27:   `EU AI Act Art. 27`,
    eu_ai_act_art_43:   `EU AI Act Art. 43`,
    eu_ai_act_art_47:   `EU AI Act Art. 47`,
    eu_ai_act_art_86:   `EU AI Act Art. 86`,
    nist_ai_rmf_govern: `NIST AI RMF`,
    nist_ai_rmf:        `NIST AI RMF`,
    iso_42001_aimc:     `ISO 42001`,
    iso_42001:          `ISO 42001`,
    au_voluntary_ai:    `AU Voluntary AI`,
    au_privacy:         `AU Privacy Act`,
    apra_cps_230:       `APRA CPS 230`,
    gdpr:               `GDPR`,
  }
  return map[fw] || fw.replace(/_/g, ` `)
}

/**
 * SVG export — FR-70.
 * Serialises the roadmap grid section to a self-contained SVG-wrapped HTML blob.
 * Uses foreignObject to embed the actual rendered HTML; falls back cleanly.
 */
function exportSvg(gridRef) {
  if (!gridRef.current) return

  const el = gridRef.current
  const { width, height } = el.getBoundingClientRect()

  // Clone the node so we can inline styles for portability
  const clone = el.cloneNode(true)

  // Add disclaimer footer into clone
  const footer = document.createElement(`p`)
  footer.style.cssText = `font-family: Georgia, serif; font-size: 11px; color: #555; margin-top: 16px; padding: 0 8px;`
  footer.textContent = `AI Risk Practice — airiskpractice.org — Governance starting point only, not legal advice.`
  clone.appendChild(footer)

  const svgNS = `http://www.w3.org/2000/svg`
  const svg = document.createElementNS(svgNS, `svg`)
  svg.setAttribute(`xmlns`, svgNS)
  svg.setAttribute(`xmlns:xhtml`, `http://www.w3.org/1999/xhtml`)
  svg.setAttribute(`width`, Math.ceil(width))
  svg.setAttribute(`height`, Math.ceil(height) + 60)
  svg.setAttribute(`viewBox`, `0 0 ${Math.ceil(width)} ${Math.ceil(height) + 60}`)

  // White background rect
  const rect = document.createElementNS(svgNS, `rect`)
  rect.setAttribute(`width`, `100%`)
  rect.setAttribute(`height`, `100%`)
  rect.setAttribute(`fill`, `white`)
  svg.appendChild(rect)

  const fo = document.createElementNS(svgNS, `foreignObject`)
  fo.setAttribute(`width`, `100%`)
  fo.setAttribute(`height`, `100%`)
  fo.appendChild(clone)
  svg.appendChild(fo)

  const serialiser = new XMLSerializer()
  const svgStr = serialiser.serializeToString(svg)
  const blob = new Blob([svgStr], { type: `image/svg+xml` })
  const url = URL.createObjectURL(blob)

  const a = document.createElement(`a`)
  a.href = url
  a.download = `governance-map.svg`
  a.click()
  URL.revokeObjectURL(url)
}
