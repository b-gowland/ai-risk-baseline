/**
 * DrillContent.jsx
 * Shared content renderers for all five drill types.
 * Used by: DetailRail (desktop) and DrillPage (mobile <768px).
 *
 * FR-96: SourceCite wired into RegulatoryContent, ControlsContent, RisksContent.
 * FR-97: Framework version footer added per framework group in RegulatoryContent.
 * Updated: May 22, 2026 — Trust & Freshness Layer
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import SourceCite from './SourceCite.jsx'
import { trackEvent } from '../utils/analytics.js'
import styles from './DrillContent.module.css'

const FUNCTION_CHIPS = [
  { id: `all`,         label: `All` },
  { id: `risk`,        label: `Risk` },
  { id: `legal`,       label: `Legal` },
  { id: `tech`,        label: `Technology` },
  { id: `procurement`, label: `Procurement` },
]

function toFunctionMap(controlsByFunction) {
  const map = {}
  ;(controlsByFunction || []).forEach(group => {
    map[group.function] = group.controls || []
  })
  return map
}

// ─── Risks ────────────────────────────────────────────────────────────────────

export function RisksContent({ output }) {
  const risks = output?.risks || []

  if (!risks.length) {
    return (
      <div className={styles.emptyDrill}>
        <p>No risks matched this configuration. <Link to="/configure">Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.riskList}>
      <p className={styles.intro}>
        Top {risks.length} risks for this configuration, ranked by relevance.
      </p>
      {risks.map((risk, i) => (
        <div key={risk.kb_id || i} className={styles.riskItem}>
          <div className={styles.riskRank}>{i + 1}</div>
          <div className={styles.riskBody}>
            <div className={styles.riskHeader}>
              <h3 className={styles.riskTitle}>{risk.title}</h3>
              <span className={styles.domainTag}>{risk.domain}</span>
            </div>
            {risk.relevance_reason && (
              <p className={styles.riskDesc}>
                {risk.relevance_reason}
                <SourceCite
                  sourceNote={risk._source_note}
                  lastVerified={risk.last_verified}
                  claimText={risk.relevance_reason}
                  itemId={risk.kb_id}
                  onOpen={() => trackEvent(`source_cite_opened`, { item_type: `risk` })}
                />
              </p>
            )}
            <div className={styles.riskLinks}>
              {risk.kb_url && (
                <a href={risk.kb_url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                  Knowledge Base ↗
                </a>
              )}
              {risk.training_scenario_id && (
                <a
                  href={`https://app.airiskpractice.org/?scenario=${risk.training_scenario_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.extLink}
                >
                  Training ↗
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Regulatory ───────────────────────────────────────────────────────────────

export function RegulatoryContent({ output }) {
  const groups = output?.regulatoryByFramework || []

  if (!groups.length) {
    return (
      <div className={styles.emptyDrill}>
        <p>No regulatory frameworks matched this configuration. <Link to="/configure">Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.regList}>
      <p className={styles.intro}>
        Applicable frameworks and article-level requirements. Every citation links to the primary source.
      </p>
      {groups.map(group => {
        const fw = group.framework || {}
        const items = group.items || []
        const fwVersion = fw.framework_version || null
        if (!items.length) return null
        return (
          <div key={fw.id} className={styles.frameworkGroup}>
            <h3 className={styles.frameworkName}>{fw.name || fw.id}</h3>
            {items.map((item, i) => {
              const level = item.mandatory ? `mandatory` : (item.obligation_type || `recommended`)
              return (
                <div key={item.id || i} className={styles.regItem}>
                  <div className={styles.regItemHeader}>
                    <span className={styles.articleRef}>{item.citation}</span>
                    <span className={`${styles.obligationBadge} ${styles[`badge_${level}`]}`}>
                      {level}
                    </span>
                    {item.effective_label && (
                      <span className={`${styles.dateBadge} ${item.is_urgent ? styles.dateUrgent : styles.dateUpcoming}`}>
                        {item.effective_label}
                      </span>
                    )}
                  </div>
                  <p className={styles.regRequirement}>
                    {item.title}
                    <SourceCite
                      sourceNote={item._source_note}
                      lastVerified={item.last_verified}
                      claimText={item.title}
                      itemId={item.id}
                      onOpen={() => trackEvent(`source_cite_opened`, { item_type: `regulatory` })}
                    />
                  </p>
                  {item.summary && item.summary !== item.title && (
                    <p className={styles.regSummary}>{item.summary}</p>
                  )}
                  {item.source_url && (
                    <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                      Primary source ↗
                    </a>
                  )}
                </div>
              )
            })}
            {/* FR-97: Framework version footer */}
            {fwVersion && (
              <p className={styles.frameworkVersion}>
                <em>Framework version: {fwVersion.citation}{fwVersion.note ? ` — ${fwVersion.note}` : ``}</em>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export function ControlsContent({ output }) {
  const allControls = output?.controls || []
  const functionMap = useMemo(() => toFunctionMap(output?.controlsByFunction), [output])
  const [activeFunction, setActiveFunction] = useState(`all`)

  const displayControls = useMemo(() => {
    if (activeFunction === `all`) return allControls
    return functionMap[activeFunction] || []
  }, [activeFunction, allControls, functionMap])

  if (!allControls.length) {
    return (
      <div className={styles.emptyDrill}>
        <p>No controls matched this configuration. <Link to="/configure">Refine your answers →</Link></p>
      </div>
    )
  }

  return (
    <div className={styles.controlsPanel}>
      <p className={styles.intro}>Controls mapped to your configuration, filtered by function.</p>
      <div className={styles.functionChips}>
        {FUNCTION_CHIPS.map(chip => (
          <button
            key={chip.id}
            className={`${styles.functionChip} ${activeFunction === chip.id ? styles.chipActive : ``}`}
            onClick={() => setActiveFunction(chip.id)}
          >
            {chip.label}
            {chip.id !== `all` && functionMap[chip.id]?.length ? (
              <span className={styles.chipCount}>{functionMap[chip.id].length}</span>
            ) : null}
          </button>
        ))}
      </div>
      {displayControls.length === 0 ? (
        <div className={styles.emptyDrill}><p>No controls for this function.</p></div>
      ) : (
        <div className={styles.controlList}>
          {displayControls.map((ctrl, i) => (
            <div key={ctrl.id || i} className={styles.controlItem}>
              <div className={styles.controlHeader}>
                <h3 className={styles.controlTitle}>{ctrl.name}</h3>
                <div className={styles.controlMeta}>
                  {ctrl.effort && (
                    <span className={`${styles.effortBadge} ${styles[`effort_${ctrl.effort?.toLowerCase()}`]}`}>
                      {ctrl.effort}
                    </span>
                  )}
                  {ctrl.owners?.length > 0 && (
                    <span className={styles.ownerTag}>{ctrl.owners.join(` + `)}</span>
                  )}
                </div>
              </div>
              {ctrl.summary && (
                <p className={styles.controlDesc}>
                  {ctrl.summary}
                  <SourceCite
                    sourceNote={ctrl._source_note}
                    lastVerified={ctrl.last_verified}
                    claimText={ctrl.summary}
                    itemId={ctrl.id}
                    onOpen={() => trackEvent(`source_cite_opened`, { item_type: `control` })}
                  />
                </p>
              )}
              {ctrl.frameworks?.length > 0 && (
                <div className={styles.fwTags}>
                  {ctrl.frameworks.map(fw => <span key={fw} className={styles.fwTag}>{fw}</span>)}
                </div>
              )}
              {ctrl.kb_refs?.length > 0 && (
                <div className={styles.controlLinks}>
                  {ctrl.kb_refs.map((ref, j) => (
                    <a
                      key={j}
                      href={`https://library.airiskpractice.org/docs/${ref}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.extLink}
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

// ─── Actions ──────────────────────────────────────────────────────────────────

export function ActionsContent({ output }) {
  const actions = output?.actions || []

  if (!actions.length) {
    return (
      <div className={styles.emptyDrill}>
        <p>No actions generated for this configuration.</p>
      </div>
    )
  }

  return (
    <div className={styles.actionList}>
      <p className={styles.intro}>Prioritised next steps, ordered by urgency and impact.</p>
      {actions.map((action, i) => (
        <div key={i} className={styles.actionItem}>
          <div className={styles.actionNum}>{i + 1}</div>
          <div className={styles.actionBody}>
            <div className={styles.actionHeader}>
              <h3 className={styles.actionTitle}>{action.name}</h3>
              <div className={styles.actionMeta}>
                {action.effort && (
                  <span className={`${styles.effortBadge} ${styles[`effort_${action.effort?.toLowerCase()}`]}`}>
                    {action.effort}
                  </span>
                )}
                {action.owner && <span className={styles.ownerTag}>{action.owner}</span>}
              </div>
            </div>
            {action.why && <p className={styles.actionDesc}>{action.why}</p>}
            {action.frameworks?.length > 0 && (
              <div className={styles.fwTags}>
                {action.frameworks.map(fw => <span key={fw} className={styles.fwTag}>{fw}</span>)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Platform ─────────────────────────────────────────────────────────────────

export function PlatformContent({ config }) {
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
        className={styles.extLink}
      >
        Watch the repo for Phase 2 updates ↗
      </a>
    </div>
  )
}
