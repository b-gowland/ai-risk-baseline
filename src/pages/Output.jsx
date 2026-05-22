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
import siteVersion from '../data/site-version.json'
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

          <ConfigSummary config={config} editParams={editParams} />

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

function ConfigSummary({ config, editParams }) {
  const chips = []
  if (config.system_type) chips.push({ label: `System`, value: config.system_type })
  if (config.context?.domain) chips.push({ label: `Domain`, value: config.context.domain })
  if (config.context?.who) chips.push({ label: `Users`, value: config.context.who })
  if (config.context?.decision_mode) chips.push({ label: `Decisions`, value: config.context.decision_mode })
  if (config.context?.build_path) chips.push({ label: `Build`, value: config.context.build_path })
  if (config.data?.data_type?.length) chips.push({ label: `Data`, value: config.data.data_type.join(`, `) })
  if (config.data?.data_scale) chips.push({ label: `Scale`, value: config.data.data_scale })
  if (config.jurisdiction?.length) chips.push({ label: `Jurisdiction`, value: config.jurisdiction.join(`, `) })
  if (config.platform && config.platform !== `skip`) chips.push({ label: `Platform`, value: config.platform })

  function handlePillClick() {
    trackEvent(`freshness_pill_clicked`)
    window.open(`/about#methodology`, `_blank`, `noopener,noreferrer`)
  }

  return (
    <div className={styles.configCard}>
      <div className={styles.configHeader}>
        <p className={styles.configEyebrow}>— YOUR CONFIGURATION</p>
        <div className={styles.configHeaderRight}>
          <button
            className={styles.freshnessPill}
            onClick={handlePillClick}
            title="About our methodology and verification process"
            type="button"
          >
            Verified {siteVersion.verified_month} · v{siteVersion.version}
          </button>
          <Link to={`/configure?${editParams.toString()}`} className={styles.editLink}>Edit →</Link>
        </div>
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
