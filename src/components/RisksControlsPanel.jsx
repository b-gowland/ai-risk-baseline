/**
 * RisksControlsPanel.jsx — Risks + Controls Map (Panel 3 in Map tab)
 *
 * Spec: BASELINE_REFERENCE.md Part 12
 * FR-73 through FR-81
 *
 * Two-column layout:
 *   Left (40%): Risk tiles, grouped by domain, ordered by score desc
 *   Right (60%): Control cards with linked risk badges
 *
 * Interaction model (click-to-pin, FR-77):
 *   - Click risk tile → pin: highlights linked control cards
 *   - Click control card → pin + inline-expand: highlights linked risk tiles
 *   - Click outside → clear all pin state
 *   - Esc → clear all pin state
 *   - Hover (desktop only, nothing pinned) → transient highlight preview
 *   - Touch (hover:none devices) → tap acts as click; no hover layer
 *
 * URL state: ?pin=risk:<kb_id> or ?pin=control:<id>
 *
 * Static export mode: pin/hover state suppressed; linked IDs rendered as text
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styles from './RisksControlsPanel.module.css'

// Domain colour map — tokens defined in DESIGN.md (domain colour section)
// A=blue B=green C=red D=orange E=purple F=teal G=brown
const DOMAIN_COLOURS = {
  A: 'var(--domain-a)',
  B: 'var(--domain-b)',
  C: 'var(--domain-c)',
  D: 'var(--domain-d)',
  E: 'var(--domain-e)',
  F: 'var(--domain-f)',
  G: 'var(--domain-g)',
}

const DOMAIN_LABELS = {
  A: 'Technical',
  B: 'Governance',
  C: 'Security',
  D: 'Data',
  E: 'Fairness',
  F: 'Human Factors',
  G: 'Agentic',
}

// Risk tile overflow cap (FR-78)
const RISK_TILE_CAP = 12

// Detect touch-primary devices (FR-77c)
function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none)')
    setIsTouch(mq.matches)
    const handler = (e) => setIsTouch(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isTouch
}

function weightLabel(score) {
  if (score >= 50) return 'High'
  if (score >= 20) return 'Medium'
  return 'Low'
}

/**
 * RisksControlsPanel
 *
 * Props:
 *   risks    — array of scored risk objects from engine (kb_id, title, domain, score, kb_url)
 *   controls — array of filtered control objects from engine
 *   links    — { riskToControls, controlToRisks } from getRiskControlLinks()
 *   isStatic — true when rendering for SVG export/print (suppress interaction)
 */
export default function RisksControlsPanel({ risks, controls, links, isStatic = false, onControlDrillOpen }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isTouch = useIsTouch()

  // Pin state (FR-77)
  const [pinnedRiskId, setPinnedRiskId] = useState(null)
  const [pinnedControlId, setPinnedControlId] = useState(null)

  // Hover state — desktop only, transient (FR-77d)
  const [hoveredRiskId, setHoveredRiskId] = useState(null)
  const [hoveredControlId, setHoveredControlId] = useState(null)

  // Expanded control for inline detail (FR-77)
  const [expandedControlId, setExpandedControlId] = useState(null)

  // Risk tile overflow (FR-78)
  const [showAllRisks, setShowAllRisks] = useState(false)

  const panelRef = useRef(null)

  // Initialise pin state from URL (?pin=risk:e1 or ?pin=control:c_bias_testing)
  useEffect(() => {
    if (isStatic) return
    const pin = searchParams.get('pin')
    if (!pin) return
    if (pin.startsWith('risk:')) {
      const id = pin.slice(5)
      setPinnedRiskId(id)
    } else if (pin.startsWith('control:')) {
      const id = pin.slice(8)
      setPinnedControlId(id)
      setExpandedControlId(id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Write pin state to URL
  const writePinToUrl = useCallback((type, id) => {
    if (isStatic) return
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (type && id) {
        next.set('pin', `${type}:${id}`)
      } else {
        next.delete('pin')
      }
      return next
    }, { replace: true })
  }, [isStatic, setSearchParams])

  // Clear all pin + hover state
  const clearAll = useCallback(() => {
    setPinnedRiskId(null)
    setPinnedControlId(null)
    setHoveredRiskId(null)
    setHoveredControlId(null)
    setExpandedControlId(null)
    writePinToUrl(null, null)
  }, [writePinToUrl])

  // Esc key clears pin state (FR-77b)
  useEffect(() => {
    if (isStatic) return
    const handler = (e) => {
      if (e.key === 'Escape') clearAll()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isStatic, clearAll])

  // Click outside panel clears pin (FR-77)
  useEffect(() => {
    if (isStatic) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        clearAll()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isStatic, clearAll])

  // Risk tile click handler
  function handleRiskClick(riskId) {
    if (pinnedRiskId === riskId) {
      // Second click on same — clear
      clearAll()
    } else {
      setPinnedRiskId(riskId)
      setPinnedControlId(null)
      setExpandedControlId(null)
      setHoveredRiskId(null)
      setHoveredControlId(null)
      writePinToUrl('risk', riskId)
    }
  }

  // Control card click handler (pin + expand)
  function handleControlClick(controlId) {
    if (pinnedControlId === controlId) {
      // Second click — collapse + clear
      clearAll()
    } else {
      setPinnedControlId(controlId)
      setExpandedControlId(controlId)
      setPinnedRiskId(null)
      setHoveredRiskId(null)
      setHoveredControlId(null)
      writePinToUrl('control', controlId)
    }
  }

  // Risk badge click inside expanded control — jump-pin to that risk
  function handleRiskBadgeClick(e, riskId) {
    e.stopPropagation()
    setPinnedRiskId(riskId)
    setPinnedControlId(null)
    // Keep control expanded for context
    writePinToUrl('risk', riskId)
  }

  // Keyboard handler (FR-77b) — Enter acts as click, Tab navigation handled by tabIndex
  function handleKeyDown(e, type, id) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (type === 'risk') handleRiskClick(id)
      else handleControlClick(id)
    }
  }

  // Determine active highlight state (pinned wins over hovered, per spec)
  function getActiveRiskId() {
    if (pinnedControlId) return null // control is pinned — risks highlighted via controlToRisks
    if (pinnedRiskId) return pinnedRiskId
    if (!isTouch) {
      if (hoveredControlId) return null
      if (hoveredRiskId) return hoveredRiskId
    }
    return null
  }

  function getActiveControlId() {
    if (pinnedRiskId) return null // risk is pinned — controls highlighted via riskToControls
    if (pinnedControlId) return pinnedControlId
    if (!isTouch) {
      if (hoveredRiskId) return null
      if (hoveredControlId) return hoveredControlId
    }
    return null
  }

  // Which risk tiles should glow?
  function isRiskHighlighted(riskId) {
    if (isStatic) return false
    const pinCtrl = pinnedControlId
    const hvrCtrl = !isTouch ? hoveredControlId : null
    const activeCtrl = pinCtrl || hvrCtrl
    if (activeCtrl) {
      return (links.controlToRisks[activeCtrl] || []).includes(riskId)
    }
    return false
  }

  // Which control cards should glow?
  function isControlHighlighted(controlId) {
    if (isStatic) return false
    const pinRisk = pinnedRiskId
    const hvrRisk = !isTouch ? hoveredRiskId : null
    const activeRisk = pinRisk || hvrRisk
    if (activeRisk) {
      return (links.riskToControls[activeRisk] || []).includes(controlId)
    }
    return false
  }

  // Group risks by domain, order by score desc within domain (FR-74)
  const risksByDomain = {}
  const sortedRisks = [...risks].sort((a, b) => b.score - a.score)
  for (const risk of sortedRisks) {
    const d = risk.domain || 'A'
    if (!risksByDomain[d]) risksByDomain[d] = []
    risksByDomain[d].push(risk)
  }

  // Flatten for overflow cap (FR-78)
  const allRisksFlat = sortedRisks
  const visibleRisks = showAllRisks ? allRisksFlat : allRisksFlat.slice(0, RISK_TILE_CAP)
  const hiddenCount = allRisksFlat.length - RISK_TILE_CAP

  // Mobile layout: <768px — two stacked flat lists (FR-79)
  // Handled via CSS media query; component renders same markup, CSS reflows

  if (!risks || risks.length === 0) {
    return (
      <section className={styles.panelRoot}>
        <div className={styles.panelHeader}>
          <span className={styles.eyebrow}>RISKS + CONTROLS</span>
          <h3 className={styles.panelTitle}>Risks this configuration surfaces, and the controls that address them.</h3>
        </div>
        <p className={styles.emptyState}>
          No risks identified for this configuration. Refine your profile to see a tailored risk and control map.
        </p>
      </section>
    )
  }

  return (
    <section
      className={`${styles.panelRoot}${isStatic ? ` ${styles.staticMode}` : ``}`}
      ref={panelRef}
      data-testid="risks-controls-panel"
    >
      {/* Panel heading */}
      <div className={styles.panelHeader}>
        <span className={styles.eyebrow}>RISKS + CONTROLS</span>
        <h3 className={styles.panelTitle}>Risks this configuration surfaces, and the controls that address them.</h3>
      </div>

      <div className={styles.columns}>
        {/* LEFT COLUMN — Risk tiles */}
        <div className={styles.risksColumn}>
          <span className={styles.columnLabel}>RISKS</span>

          <div className={styles.riskGrid}>
            {visibleRisks.map(risk => {
              const hasControls = (links.riskToControls[risk.kb_id] || []).length > 0
              const isPinned = pinnedRiskId === risk.kb_id
              const isHighlighted = isRiskHighlighted(risk.kb_id)
              const domainColour = DOMAIN_COLOURS[risk.domain] || 'var(--domain-a)'

              return (
                <div
                  key={risk.kb_id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPinned}
                  aria-label={`${risk.title} — ${hasControls ? weightLabel(risk.score) + ' weight' : 'No controls mapped'}`}
                  className={[
                    styles.riskTile,
                    !hasControls ? styles.riskTileGreyed : '',
                    isPinned ? styles.riskTilePinned : '',
                    isHighlighted && !isPinned ? styles.riskTileHighlighted : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleRiskClick(risk.kb_id)}
                  onKeyDown={e => handleKeyDown(e, 'risk', risk.kb_id)}
                  onMouseEnter={() => !isTouch && !pinnedRiskId && !pinnedControlId && setHoveredRiskId(risk.kb_id)}
                  onMouseLeave={() => !isTouch && setHoveredRiskId(null)}
                >
                  {isPinned && !isStatic && (
                    <span className={styles.pinnedEyebrow} aria-hidden="true">PINNED</span>
                  )}

                  <div className={styles.riskTileTop}>
                    <span
                      className={styles.domainBadge}
                      style={{ background: domainColour }}
                      title={DOMAIN_LABELS[risk.domain] || risk.domain}
                    >
                      {risk.domain}
                    </span>
                    {hasControls ? (
                      <span className={styles.weightPill}>{weightLabel(risk.score)}</span>
                    ) : (
                      <span className={styles.noControlsHint}>No controls mapped — discuss in this meeting</span>
                    )}
                  </div>

                  <div className={styles.riskId}>{risk.kb_id.toUpperCase()}</div>
                  <div className={styles.riskTitle}>{risk.title}</div>

                  {risk.kb_url && (
                    <a
                      href={risk.kb_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.kbLink}
                      onClick={e => e.stopPropagation()}
                      tabIndex={-1}
                      aria-label={`Open ${risk.title} in Knowledge Base`}
                    >
                      KB ↗
                    </a>
                  )}

                  {/* Static export: show linked control IDs as text (FR-80) */}
                  {isStatic && (links.riskToControls[risk.kb_id] || []).length > 0 && (
                    <div className={styles.staticLinks}>
                      Controls: {(links.riskToControls[risk.kb_id] || []).join(', ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Overflow cap expand (FR-78) */}
          {!showAllRisks && hiddenCount > 0 && (
            <button
              className={styles.showMoreBtn}
              onClick={() => setShowAllRisks(true)}
            >
              + {hiddenCount} more risk{hiddenCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* RIGHT COLUMN — Control cards */}
        <div className={styles.controlsColumn}>
          <span className={styles.columnLabel}>CONTROLS</span>

          <div className={styles.controlsList}>
            {controls.map(control => {
              const isPinned = pinnedControlId === control.id
              const isHighlighted = isControlHighlighted(control.id)
              const isExpanded = expandedControlId === control.id
              const linkedRiskIds = links.controlToRisks[control.id] || []
              const hasLinkedRisks = linkedRiskIds.length > 0

              return (
                <div
                  key={control.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPinned}
                  aria-expanded={isExpanded}
                  aria-label={`${control.name}${isPinned ? ' — pinned' : ''}`}
                  className={[
                    styles.controlCard,
                    isPinned ? styles.controlCardPinned : '',
                    isHighlighted && !isPinned ? styles.controlCardHighlighted : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleControlClick(control.id)}
                  onKeyDown={e => handleKeyDown(e, 'control', control.id)}
                  onMouseEnter={() => !isTouch && !pinnedRiskId && !pinnedControlId && setHoveredControlId(control.id)}
                  onMouseLeave={() => !isTouch && setHoveredControlId(null)}
                  onDoubleClick={e => {
                    // Double-click → open Controls drill focused on this control (FR-95)
                    e.stopPropagation()
                    if (onControlDrillOpen) onControlDrillOpen(control.id)
                  }}
                >
                  {isPinned && !isStatic && (
                    <span className={styles.pinnedEyebrow} aria-hidden="true">PINNED</span>
                  )}

                  <div className={styles.controlCardTop}>
                    <span className={`${styles.mandatoryBadge} ${control.mandatory ? styles.mandatory : styles.recommended}`}>
                      {control.mandatory ? 'MANDATORY' : 'RECOMMENDED'}
                    </span>
                    <span className={styles.controlName}>{control.name}</span>
                  </div>

                  <div className={styles.controlMeta}>
                    {(control.owners || []).map(o => (
                      <span key={o} className={styles.ownerChip}>{o.charAt(0).toUpperCase() + o.slice(1)}</span>
                    ))}
                    <span className={styles.effortChip}>{control.effort} effort</span>
                  </div>

                  <p className={styles.controlSummary}>{control.summary.split('. ')[0]}.</p>

                  {/* Linked risks badges — always shown when card has links */}
                  {hasLinkedRisks && (
                    <div className={styles.linkedRisks}>
                      <span className={styles.linkedRisksLabel}>Risks: </span>
                      {linkedRiskIds.map(riskId => {
                        const risk = risks.find(r => r.kb_id === riskId)
                        const colour = risk ? (DOMAIN_COLOURS[risk.domain] || 'var(--domain-a)') : 'var(--domain-a)'
                        return (
                          <button
                            key={riskId}
                            className={styles.riskBadge}
                            style={{ background: colour }}
                            title={risk?.title || riskId}
                            onClick={e => !isStatic && handleRiskBadgeClick(e, riskId)}
                            onMouseEnter={e => {
                              if (!isTouch && !isStatic) {
                                e.stopPropagation()
                                setHoveredRiskId(riskId)
                              }
                            }}
                            onMouseLeave={() => !isTouch && setHoveredRiskId(null)}
                            aria-label={`Pin risk ${riskId.toUpperCase()}${risk ? ': ' + risk.title : ''}`}
                          >
                            {riskId.toUpperCase()}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Inline expanded detail (FR-77) */}
                  {isExpanded && !isStatic && (
                    <div className={styles.controlExpanded}>
                      <p className={styles.controlFullSummary}>{control.summary}</p>
                      {control.frameworks && control.frameworks.length > 0 && (
                        <div className={styles.frameworkTags}>
                          {control.frameworks.map(fw => (
                            <span key={fw} className={styles.frameworkTag}>{fw.replace(/_/g, ' ')}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Static export: show linked risk IDs as text (FR-80) */}
                  {isStatic && hasLinkedRisks && (
                    <div className={styles.staticLinks}>
                      Linked risks: {linkedRiskIds.join(', ')}
                    </div>
                  )}
                </div>
              )
            })}

            {controls.length === 0 && (
              <p className={styles.emptyState}>No controls matched this configuration.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
