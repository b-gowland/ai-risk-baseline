import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { buildOutput } from '../engine/baseline.js'
import { decodeConfig, encodeConfig, isPartialConfig } from '../engine/url-state.js'
import { buildMarkdownExport } from '../utils/markdown-export.js'
import { trackEvent, events } from '../utils/analytics.js'
import styles from './Output.module.css'

const TABS = [
  { id: `risks`,      label: `Risks` },
  { id: `regulatory`, label: `Regulatory` },
  { id: `controls`,   label: `Controls` },
  { id: `actions`,    label: `Actions` },
  { id: `platform`,   label: `Platform` },
]

const FUNCTION_CHIPS = [
  { id: `all`,         label: `All` },
  { id: `risk`,        label: `Risk` },
  { id: `legal`,       label: `Legal` },
  { id: `tech`,        label: `Technology` },
  { id: `procurement`, label: `Procurement` },
]

export default function Output() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get(`tab`) || `risks`
  })
  const [activeFunction, setActiveFunction] = useState(`all`)
  const [copyState, setCopyState] = useState(`idle`) // idle | copied

  const config = useMemo(() => decodeConfig(searchParams), [searchParams])
  const partial = useMemo(() => !config || isPartialConfig(config), [config])

  const output = useMemo(() => {
    if (!config) return null
    return buildOutput(config, new Date())
  }, [config])

  useEffect(() => {
    trackEvent(events.TAB_VIEWED, { tab: activeTab })
  }, [activeTab])

  // No config at all → redirect prompt
  if (!config) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyInner}>
          <p className={styles.emptyEyebrow}>— NO CONFIGURATION</p>
          <h1 className={styles.emptyTitle}>No configuration yet</h1>
          <p className={styles.emptyText}>
            Answer five questions to get your governance baseline.
          </p>
          <Link to={`/configure`} className={styles.btnPrimary}>
            Start profiling →
          </Link>
        </div>
      </div>
    )
  }

  function handleCopyUrl() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
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
    trackEvent(events.PDF_PRINTED)
    window.print()
  }

  const editParams = encodeConfig(config)

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        {/* Partial config banner */}
        {partial && (
          <div className={styles.partialBanner}>
            <span>Some answers were unspecified — output is broader than it could be.</span>
            <Link to={`/configure?${editParams.toString()}`} className={styles.partialLink}>
              Refine →
            </Link>
          </div>
        )}

        {/* Config summary card */}
        <ConfigSummary config={config} editParams={editParams} />

        {/* Tab bar */}
        <div className={styles.tabBar} role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ``}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === `risks` && output?.risks?.length ? (
                <span className={styles.tabBadge}>{output.risks.length}</span>
              ) : null}
              {tab.id === `regulatory` && output?.regulatory?.length ? (
                <span className={styles.tabBadge}>{output.regulatory.length}</span>
              ) : null}
              {tab.id === `controls` && output?.controls?.length ? (
                <span className={styles.tabBadge}>{output.controls.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={styles.tabContent} role="tabpanel">
          {activeTab === `risks` && (
            <RisksTab output={output} />
          )}
          {activeTab === `regulatory` && (
            <RegulatoryTab output={output} />
          )}
          {activeTab === `controls` && (
            <ControlsTab
              output={output}
              activeFunction={activeFunction}
              setActiveFunction={setActiveFunction}
            />
          )}
          {activeTab === `actions` && (
            <ActionsTab output={output} />
          )}
          {activeTab === `platform` && (
            <PlatformTab config={config} />
          )}
        </div>

        {/* Export bar */}
        <div className={styles.exportBar}>
          <button
            className={styles.exportBtn}
            onClick={handleCopyUrl}
          >
            {copyState === `copied` ? `✓ URL copied` : `Copy URL`}
          </button>
          <button
            className={styles.exportBtn}
            onClick={handleCopyMarkdown}
          >
            {copyState === `md` ? `✓ Copied` : `Copy Markdown`}
          </button>
          <button
            className={styles.exportBtn}
            onClick={handlePrint}
          >
            Print / PDF
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Config Summary ───────────────────────────────────────────────────────────

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
  if (config.platform) chips.push({ label: `Platform`, value: config.platform })

  return (
    <div className={styles.configCard}>
      <div className={styles.configHeader}>
        <p className={styles.configEyebrow}>— YOUR CONFIGURATION</p>
        <Link
          to={`/configure?${editParams.toString()}`}
          className={styles.editLink}
        >
          Edit →
        </Link>
      </div>
      <div className={styles.configChips}>
        {chips.map((chip, i) => (
          <span key={i} className={styles.configChip}>
            <span className={styles.chipLabel}>{chip.label}</span>
            <span className={styles.chipValue}>{chip.value}</span>
          </span>
        ))}
        {chips.length === 0 && (
          <span className={styles.configChipEmpty}>No configuration specified</span>
        )}
      </div>
    </div>
  )
}

// ─── Risks Tab ────────────────────────────────────────────────────────────────

function RisksTab({ output }) {
  const risks = output?.risks || []

  if (!risks.length) {
    return (
      <div className={styles.emptyTab}>
        <p>No risks matched this configuration. <Link to={`/configure`}>Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.riskList}>
      <p className={styles.tabIntro}>
        Top {risks.length} risks for this configuration, ranked by relevance.
        Each links to the Knowledge Base for detailed analysis and mitigation guidance.
      </p>
      {risks.map((risk, i) => (
        <div key={risk.id} className={styles.riskItem}>
          <div className={styles.riskRank}>{i + 1}</div>
          <div className={styles.riskBody}>
            <div className={styles.riskHeader}>
              <h3 className={styles.riskTitle}>{risk.title}</h3>
              <span className={`${styles.domainTag} ${styles[`domain_${risk.domain}`]}`}>
                {risk.domain}
              </span>
            </div>
            {risk.description && (
              <p className={styles.riskDesc}>{risk.description}</p>
            )}
            <div className={styles.riskLinks}>
              {risk.kb_ref && (
                <a
                  href={`https://b-gowland.github.io/ai-risk-kb/docs/${risk.kb_ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.kbLink}
                >
                  Knowledge Base ↗
                </a>
              )}
              {risk.scenario_ref && (
                <a
                  href={`https://b-gowland.github.io/ai-risk-training/?scenario=${risk.scenario_ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.kbLink}
                >
                  Training scenario ↗
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Regulatory Tab ───────────────────────────────────────────────────────────

function RegulatoryTab({ output }) {
  const byFramework = output?.regulatoryByFramework || {}
  const frameworkKeys = Object.keys(byFramework)

  if (!frameworkKeys.length) {
    return (
      <div className={styles.emptyTab}>
        <p>No regulatory frameworks matched this configuration. <Link to={`/configure`}>Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.regList}>
      <p className={styles.tabIntro}>
        Applicable regulatory frameworks and article-level requirements for this configuration.
        Every citation links to the primary source.
      </p>
      {frameworkKeys.map(fw => {
        const items = byFramework[fw]
        if (!items?.length) return null
        const frameworkName = items[0]?.framework_name || fw
        return (
          <div key={fw} className={styles.frameworkGroup}>
            <h3 className={styles.frameworkName}>{frameworkName}</h3>
            {items.map((item, i) => (
              <div key={i} className={styles.regItem}>
                <div className={styles.regItemHeader}>
                  <span className={styles.articleRef}>{item.article_ref}</span>
                  <span className={`${styles.obligationBadge} ${styles[`badge_${item.obligation_level}`]}`}>
                    {item.obligation_level}
                  </span>
                  {item.effective_label && (
                    <span className={`${styles.dateBadge} ${item.is_urgent ? styles.dateUrgent : styles.dateUpcoming}`}>
                      {item.effective_label}
                    </span>
                  )}
                </div>
                <p className={styles.regRequirement}>{item.requirement}</p>
                {item._source_note && (
                  <p className={styles.sourceNote}>{item._source_note}</p>
                )}
                {item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.sourceLink}
                  >
                    Primary source ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── Controls Tab ─────────────────────────────────────────────────────────────

function ControlsTab({ output, activeFunction, setActiveFunction }) {
  const byFunction = output?.controlsByFunction || {}
  const allControls = output?.controls || []

  const displayControls = useMemo(() => {
    if (activeFunction === `all`) return allControls
    return byFunction[activeFunction] || []
  }, [activeFunction, allControls, byFunction])

  if (!allControls.length) {
    return (
      <div className={styles.emptyTab}>
        <p>No controls matched this configuration. <Link to={`/configure`}>Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.controlsPanel}>
      <p className={styles.tabIntro}>
        Controls mapped to your configuration, filtered by function.
        Each shows owner, effort, and applicable frameworks.
      </p>

      {/* Function filter chips */}
      <div className={styles.functionChips}>
        {FUNCTION_CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`${styles.functionChip} ${activeFunction === chip.id ? styles.chipActive : ``}`}
            onClick={() => setActiveFunction(chip.id)}
          >
            {chip.label}
            {chip.id !== `all` && byFunction[chip.id]?.length ? (
              <span className={styles.chipCount}>{byFunction[chip.id].length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {displayControls.length === 0 ? (
        <div className={styles.emptyTab}>
          <p>No controls for this function. Try a different filter.</p>
        </div>
      ) : (
        <div className={styles.controlList}>
          {displayControls.map((ctrl, i) => (
            <div key={ctrl.id || i} className={styles.controlItem}>
              <div className={styles.controlHeader}>
                <h3 className={styles.controlTitle}>{ctrl.title}</h3>
                <div className={styles.controlMeta}>
                  {ctrl.effort && (
                    <span className={`${styles.effortBadge} ${styles[`effort_${ctrl.effort?.toLowerCase()}`]}`}>
                      {ctrl.effort}
                    </span>
                  )}
                  {ctrl.owner && (
                    <span className={styles.ownerTag}>{ctrl.owner}</span>
                  )}
                </div>
              </div>
              {ctrl.description && (
                <p className={styles.controlDesc}>{ctrl.description}</p>
              )}
              {ctrl.frameworks?.length > 0 && (
                <div className={styles.controlFrameworks}>
                  {ctrl.frameworks.map(fw => (
                    <span key={fw} className={styles.fwTag}>{fw}</span>
                  ))}
                </div>
              )}
              {ctrl.kb_refs?.length > 0 && (
                <div className={styles.controlLinks}>
                  {ctrl.kb_refs.map((ref, j) => (
                    <a
                      key={j}
                      href={`https://b-gowland.github.io/ai-risk-kb/docs/${ref}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.kbLink}
                    >
                      KB: {ref} ↗
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Actions Tab ──────────────────────────────────────────────────────────────

function ActionsTab({ output }) {
  const actions = output?.actions || []

  if (!actions.length) {
    return (
      <div className={styles.emptyTab}>
        <p>No actions generated for this configuration.</p>
      </div>
    )
  }

  return (
    <div className={styles.actionList}>
      <p className={styles.tabIntro}>
        Prioritised next steps for your configuration, ordered by urgency and impact.
      </p>
      {actions.map((action, i) => (
        <div key={i} className={styles.actionItem}>
          <div className={styles.actionNum}>{i + 1}</div>
          <div className={styles.actionBody}>
            <div className={styles.actionHeader}>
              <h3 className={styles.actionTitle}>{action.title}</h3>
              <div className={styles.actionMeta}>
                {action.effort && (
                  <span className={`${styles.effortBadge} ${styles[`effort_${action.effort?.toLowerCase()}`]}`}>
                    {action.effort}
                  </span>
                )}
                {action.owner && (
                  <span className={styles.ownerTag}>{action.owner}</span>
                )}
              </div>
            </div>
            {action.description && (
              <p className={styles.actionDesc}>{action.description}</p>
            )}
            {action.frameworks?.length > 0 && (
              <div className={styles.controlFrameworks}>
                {action.frameworks.map(fw => (
                  <span key={fw} className={styles.fwTag}>{fw}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Platform Tab (Phase 2 placeholder) ──────────────────────────────────────

function PlatformTab({ config }) {
  const platform = config?.platform

  return (
    <div className={styles.platformPlaceholder}>
      <p className={styles.platformEyebrow}>— COMING IN PHASE 2</p>
      <h3 className={styles.platformTitle}>Platform-native controls</h3>
      <p className={styles.platformText}>
        Phase 2 will map platform-native AI governance controls for AWS, Azure, Google Cloud,
        and other providers — showing exactly which built-in guardrails, logging, and
        monitoring tools apply to your configuration.
      </p>
      {platform && platform !== `skip` && (
        <p className={styles.platformNote}>
          Your selected platform: <strong>{platform}</strong>.
          Controls for this platform will appear here when Phase 2 ships.
        </p>
      )}
      <a
        href="https://github.com/b-gowland/ai-risk-baseline"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.platformLink}
      >
        Watch the repo for Phase 2 updates ↗
      </a>
    </div>
  )
}
