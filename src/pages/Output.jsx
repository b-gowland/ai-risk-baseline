import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { buildOutput } from '../engine/baseline.js'
import { decodeConfig, encodeConfig, isPartialConfig } from '../engine/url-state.js'
import { buildMarkdownExport } from '../utils/markdown-export.js'
import { trackEvent, events } from '../utils/analytics.js'
import MapTab from '../components/MapTab.jsx'
import DrillChips from '../components/DrillChips.jsx'
import DetailRail from '../components/DetailRail.jsx'
import {
  RisksContent,
  RegulatoryContent,
  ControlsContent,
  ActionsContent,
  PlatformContent,
} from '../components/DrillContent.jsx'
import { useDrillState } from '../hooks/useDrillState.js'
import SYSTEM_CONFIG from '../data/system-config.json'
import REGULATORY from '../data/regulatory-mappings.json'
import styles from './Output.module.css'

// Legacy ?tab= → ?drill= rewrite map (FR-95)
// 'map' tab → no drill (canvas is the default, strip param only)
const TAB_TO_DRILL = {
  regulatory: `regulatory`,
  risks:      `risks`,
  controls:   `controls`,
  actions:    `actions`,
  platform:   `platform`,
}

const DRILL_TITLES = {
  regulatory: `Regulatory`,
  risks:      `Risks`,
  controls:   `Controls`,
  actions:    `Actions`,
  platform:   `Platform`,
}

export default function Output() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [copyState, setCopyState] = useState(`idle`)
  const [includeRailInPrint, setIncludeRailInPrint] = useState(false)

  // Legacy ?tab= rewrite on mount (FR-95)
  useEffect(() => {
    const legacyTab = searchParams.get(`tab`)
    if (!legacyTab) return
    const drill = TAB_TO_DRILL[legacyTab]
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete(`tab`)
      if (drill) next.set(`drill`, drill)
      return next
    }, { replace: true })
    trackEvent(events.TAB_VIEWED, { tab: legacyTab })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const config = useMemo(() => decodeConfig(searchParams), [searchParams])
  const partial = useMemo(() => !config || isPartialConfig(config), [config])
  const output = useMemo(() => {
    if (!config) return null
    return buildOutput(config, new Date())
  }, [config])

  const { drill, focus, openDrill, toggleDrill, closeDrill } = useDrillState()

  // Analytics: drill_opened, drill_focus_set (FR-96)
  const prevDrillRef = useRef(null)
  useEffect(() => {
    if (drill && drill !== prevDrillRef.current) {
      trackEvent(`drill_opened`, { name: drill })
    }
    if (focus && drill) {
      trackEvent(`drill_focus_set`, { name: drill, focus })
    }
    prevDrillRef.current = drill
  }, [drill, focus])

  // Mobile: navigate to full-screen DrillPage on <768px
  function handleDrillToggle(name) {
    if (window.innerWidth < 768) {
      const params = new URLSearchParams(searchParams)
      navigate(`/output/drill/${name}?${params.toString()}`)
      return
    }
    toggleDrill(name)
  }

  const editParams = encodeConfig(config)

  if (!config) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyInner}>
          <p className={styles.emptyEyebrow}>— NO CONFIGURATION</p>
          <h1 className={styles.emptyTitle}>No configuration yet</h1>
          <p className={styles.emptyText}>Answer five questions to get your governance baseline.</p>
          <Link to={`/configure`} className={styles.btnPrimary}>Start profiling →</Link>
        </div>
      </div>
    )
  }

  function handleCopyUrl() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyState(`copied`)
      trackEvent(events.URL_COPIED)
      setTimeout(() => setCopyState(`idle`), 2000)
    })
  }

  function handleCopyMarkdown() {
    const md = buildMarkdownExport(output, config)
    navigator.clipboard.writeText(md).then(() => {
      setCopyState(`md`)
      trackEvent(events.MARKDOWN_COPIED)
      setTimeout(() => setCopyState(`idle`), 2000)
    })
  }

  function handlePrint() {
    if (includeRailInPrint && drill) {
      trackEvent(`drill_export_with_rail`, { name: drill })
    }
    trackEvent(events.PDF_PRINTED)
    window.print()
  }

  return (
    <>
      <div className={`${styles.page} ${drill ? styles.pageWithRail : ``}`}>
        <div className={styles.inner}>

          {partial && (
            <div className={styles.partialBanner}>
              <span>Some answers were unspecified — output is broader than it could be.</span>
              <Link to={`/configure?${editParams.toString()}`} className={styles.partialLink}>Refine →</Link>
            </div>
          )}

          <ConfigSummary config={config} editParams={editParams} controlCount={output?.controls?.length || 0} />

          <KeyDates regulatory={output?.regulatory} onOpen={() => (drill === `regulatory` ? null : handleDrillToggle(`regulatory`))} />

          <DrillChips
            output={output}
            activeDrill={drill}
            onToggle={handleDrillToggle}
          />

          <div className={styles.canvas} aria-label="Governance baseline canvas">
            <MapTab
              output={output}
              config={config}
              editParams={editParams}
              onControlDrillOpen={(controlId) => openDrill(`controls`, controlId)}
            />
          </div>

          <div className={styles.exportBar}>
            <button className={styles.exportBtn} onClick={handleCopyUrl}>
              {copyState === `copied` ? `✓ URL copied` : `Copy URL`}
            </button>
            <button className={styles.exportBtn} onClick={handleCopyMarkdown}>
              {copyState === `md` ? `✓ Copied` : `Copy Markdown`}
            </button>
            {drill && (
              <label className={styles.includeRailLabel}>
                <input
                  type="checkbox"
                  checked={includeRailInPrint}
                  onChange={e => setIncludeRailInPrint(e.target.checked)}
                  className={styles.includeRailCheck}
                />
                Include open {DRILL_TITLES[drill] || drill} in PDF
              </label>
            )}
            <button className={styles.exportBtn} onClick={handlePrint}>Print / PDF</button>
          </div>

        </div>
      </div>

      <DetailRail
        open={!!drill}
        title={DRILL_TITLES[drill] || drill || ``}
        onClose={closeDrill}
      >
        {drill === `risks`      && <RisksContent output={output} />}
        {drill === `regulatory` && <RegulatoryContent output={output} />}
        {drill === `controls`   && <ControlsContent output={output} />}
        {drill === `actions`    && <ActionsContent output={output} />}
        {drill === `platform`   && <PlatformContent config={config} />}
      </DetailRail>
    </>
  )
}

// ─── KeyDates — upcoming and recently commenced obligations ──────────────────

const FRAMEWORK_NAMES = Object.fromEntries(REGULATORY.frameworks.map(f => [f.id, f.name]))
const RECENT_DAYS = 180

// "Privacy Act 1988 — automated decision-making…" under "AU Privacy Act" → "automated decision-making…"
function withoutFrameworkPrefix(title, frameworkName) {
  const [head, ...rest] = title.split(` — `)
  if (!rest.length) return title
  const shared = head.split(` `).some(word => word.length > 3 && frameworkName.includes(word))
  return shared ? rest.join(` — `) : title
}

function KeyDates({ regulatory, onOpen }) {
  const now = Date.now()
  const groups = new Map()
  for (const item of regulatory || []) {
    if (!item.effective_from || !item.mandatory) continue
    const at = new Date(`${item.effective_from}T00:00:00Z`).getTime()
    const ageDays = (now - at) / 86400000
    if (ageDays > RECENT_DAYS) continue
    const key = `${item.effective_from}|${item.framework}`
    if (!groups.has(key)) groups.set(key, { date: item.effective_from, at, framework: item.framework, past: ageDays >= 0, items: [] })
    groups.get(key).items.push(item)
  }
  const rows = [...groups.values()].sort((a, b) => a.at - b.at)
  if (!rows.length) return null

  const fmt = at => new Date(at).toLocaleDateString(`en-GB`, { day: `numeric`, month: `short`, year: `numeric`, timeZone: `UTC` })
  return (
    <section className={styles.keyDates} aria-labelledby="key-dates-title">
      <p id="key-dates-title" className={styles.configEyebrow}>— KEY DATES FOR THIS CONFIGURATION</p>
      <ol className={styles.keyDatesList}>
        {rows.map(row => {
          const name = FRAMEWORK_NAMES[row.framework] || row.framework
          const titles = [...new Set(row.items.map(i => withoutFrameworkPrefix(i.title, name)))]
          const shown = titles.slice(0, 2).join(`; `)
          const more = titles.length > 2 ? ` and ${titles.length - 2} more` : ``
          return (
            <li key={`${row.date}${row.framework}`} className={styles.keyDate}>
              <span className={`${styles.keyDateWhen} ${row.past ? styles.keyDatePast : ``}`}>
                {row.past ? `In force since ${fmt(row.at)}` : fmt(row.at)}
              </span>
              <span className={styles.keyDateWhat}>
                <strong>{name}</strong> — {shown}{more}
              </span>
            </li>
          )
        })}
      </ol>
      <button type="button" className={styles.keyDatesLink} onClick={onOpen}>
        See all regulatory obligations →
      </button>
    </section>
  )
}

// Option value → display label, from the question schema (e.g. llm_chatbot → "LLM / chatbot")
const OPTION_LABELS = (() => {
  const map = {}
  for (const q of SYSTEM_CONFIG.questions) {
    for (const group of [q, ...(q.parts || [])]) {
      for (const opt of group.options || []) map[`${group.id}.${opt.value}`] = opt.label
    }
  }
  return map
})()

function labelFor(field, values) {
  const list = Array.isArray(values) ? values : [values]
  return list.map(v => OPTION_LABELS[`${field}.${v}`] || v).join(`, `)
}

function ConfigSummary({ config, editParams, controlCount }) {
  const chips = []
  if (config.system_type) chips.push({ label: `System`, value: labelFor(`system_type`, config.system_type) })
  if (config.context?.domain?.length) chips.push({ label: `Domain`, value: labelFor(`domain`, config.context.domain) })
  if (config.context?.who?.length) chips.push({ label: `Users`, value: labelFor(`who`, config.context.who) })
  if (config.context?.decision_mode?.length) chips.push({ label: `Decisions`, value: labelFor(`decision_mode`, config.context.decision_mode) })
  if (config.context?.build_path) chips.push({ label: `Build`, value: labelFor(`build_path`, config.context.build_path) })
  if (config.data?.data_type?.length) chips.push({ label: `Data`, value: labelFor(`data_type`, config.data.data_type) })
  if (config.data?.data_scale) chips.push({ label: `Scale`, value: labelFor(`data_scale`, config.data.data_scale) })
  if (config.jurisdiction?.length) chips.push({ label: `Jurisdiction`, value: labelFor(`jurisdiction`, config.jurisdiction) })
  if (config.platform && config.platform !== `skip`) chips.push({ label: `Platform`, value: labelFor(`platform`, config.platform) })

  return (
    <div className={styles.configCard}>
      <div className={styles.configHeader}>
        <p className={styles.configEyebrow}>— YOUR CONFIGURATION · {controlCount} CONTROLS</p>
        <Link to={`/configure?${editParams.toString()}`} className={styles.editLink}>Edit →</Link>
      </div>
      <div className={styles.configChips}>
        {chips.map((chip, i) => (
          <span key={i} className={styles.configChip}>
            <span className={styles.chipLabel}>{chip.label}</span>
            <span className={styles.chipValue}>{chip.value}</span>
          </span>
        ))}
        {chips.length === 0 && <span className={styles.configChipEmpty}>No configuration specified</span>}
      </div>
    </div>
  )
}
