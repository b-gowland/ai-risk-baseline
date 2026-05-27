/**
 * DrillContent.jsx
 * Shared content renderers for all five drill types.
 * Used by: DetailRail (desktop) and DrillPage (mobile <768px).
 *
 * FR-97: Framework version footer retained per framework group in RegulatoryContent.
 * FR-96 (SourceCite per-item icons): removed — content currency statement on About page instead.
 * Updated: May 22, 2026
 */

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
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
              <p className={styles.riskDesc}>{risk.relevance_reason}</p>
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
                  <p className={styles.regRequirement}>{item.title}</p>
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
                <p className={styles.controlDesc}>{ctrl.summary}</p>
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

const PLATFORM_DATA = {
  azure_ai_foundry: {
    label: `Azure AI Foundry / Azure OpenAI`,
    summary: `Microsoft's unified platform for building, deploying, and governing enterprise AI — includes content filtering, prompt shields, and Azure AI Studio.`,
    checked: `May 2026`,
    links: [
      { text: `Azure AI Foundry documentation`, href: `https://learn.microsoft.com/en-us/azure/ai-foundry/` },
      { text: `Content filtering and safety`, href: `https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter` },
      { text: `Prompt Shields (jailbreak + indirect attack)`, href: `https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/jailbreak-detection` },
      { text: `AI governance with Azure Policy`, href: `https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/governance` },
    ],
  },
  aws_bedrock: {
    label: `AWS Bedrock`,
    summary: `Amazon's fully managed service for foundation models — includes Guardrails for content filtering, model invocation logging, and IAM-based access control.`,
    checked: `May 2026`,
    links: [
      { text: `Amazon Bedrock documentation`, href: `https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html` },
      { text: `Guardrails for Amazon Bedrock`, href: `https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html` },
      { text: `Model invocation logging`, href: `https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html` },
      { text: `Security and compliance overview`, href: `https://docs.aws.amazon.com/bedrock/latest/userguide/security.html` },
    ],
  },
  google_vertex: {
    label: `Google Vertex AI / Gemini API`,
    summary: `Google Cloud's AI platform with Gemini models, Model Armor for safety filtering, and built-in audit logging via Cloud Audit Logs.`,
    checked: `May 2026`,
    links: [
      { text: `Vertex AI documentation`, href: `https://cloud.google.com/vertex-ai/docs` },
      { text: `Model Armor (safety filters)`, href: `https://cloud.google.com/vertex-ai/generative-ai/docs/model-armor/overview` },
      { text: `Responsible AI practices`, href: `https://cloud.google.com/responsible-ai` },
      { text: `Audit logging for Vertex AI`, href: `https://cloud.google.com/vertex-ai/docs/general/audit-logging` },
    ],
  },
  openai_api: {
    label: `OpenAI API (direct)`,
    summary: `OpenAI's direct API access — moderation endpoint, usage policies, and enterprise controls via the OpenAI Platform dashboard.`,
    checked: `May 2026`,
    links: [
      { text: `OpenAI API documentation`, href: `https://platform.openai.com/docs` },
      { text: `Moderation endpoint`, href: `https://platform.openai.com/docs/guides/moderation` },
      { text: `Usage policies`, href: `https://openai.com/policies/usage-policies` },
      { text: `Enterprise privacy and security`, href: `https://openai.com/enterprise-privacy` },
    ],
  },
  anthropic_api: {
    label: `Anthropic API`,
    summary: `Anthropic's API for Claude models — includes usage policies, trust and safety guidance, and model safety research documentation.`,
    checked: `May 2026`,
    links: [
      { text: `Anthropic API documentation`, href: `https://docs.anthropic.com` },
      { text: `Usage policy`, href: `https://www.anthropic.com/legal/aup` },
      { text: `Model safety and responsible scaling`, href: `https://www.anthropic.com/responsible-scaling-policy` },
      { text: `Claude constitutional AI overview`, href: `https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback` },
    ],
  },
  on_premise: {
    label: `On-premise / self-hosted`,
    summary: `Self-hosted models (open weights or licensed) — governance relies entirely on your own infrastructure, access controls, and monitoring tooling.`,
    checked: `May 2026`,
    links: [
      { text: `NIST AI RMF — govern function`, href: `https://airc.nist.gov/Docs/1` },
      { text: `OWASP LLM Top 10`, href: `https://owasp.org/www-project-top-10-for-large-language-model-applications/` },
      { text: `ISO/IEC 42001 implementation guide`, href: `https://www.iso.org/standard/81230.html` },
      { text: `Hugging Face model cards and safetensors`, href: `https://huggingface.co/docs/hub/model-cards` },
    ],
  },
  other_mixed: {
    label: `Other / mixed cloud`,
    summary: `Multi-provider or mixed-cloud deployments — governance typically spans each provider's native controls plus a unified policy layer.`,
    checked: `May 2026`,
    links: [
      { text: `NIST AI RMF — manage function`, href: `https://airc.nist.gov/Docs/1` },
      { text: `ISO/IEC 42001 (AI management system)`, href: `https://www.iso.org/standard/81230.html` },
      { text: `OWASP LLM Top 10`, href: `https://owasp.org/www-project-top-10-for-large-language-model-applications/` },
      { text: `AI governance multi-cloud patterns — CSA`, href: `https://cloudsecurityalliance.org/research/topics/artificial-intelligence` },
    ],
  },
}

function PlatformCard({ data, highlight }) {
  return (
    <div className={highlight ? styles.platformCardHighlight : styles.platformCard}>
      <div className={styles.platformCardHeader}>
        <span className={styles.platformCardName}>{data.label}</span>
        <span className={styles.platformCardChecked}>Links checked {data.checked}</span>
      </div>
      <p className={styles.platformCardSummary}>{data.summary}</p>
      <ul className={styles.platformLinks}>
        {data.links.map((lnk, i) => (
          <li key={i}>
            <a
              href={lnk.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extLink}
            >
              {lnk.text} ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PlatformContent({ config }) {
  const selected = config?.platform
  const hasSelection = selected && selected !== `skip`
  const selectedData = hasSelection ? PLATFORM_DATA[selected] : null
  const otherPlatforms = Object.entries(PLATFORM_DATA).filter(([k]) => k !== selected)

  return (
    <div className={styles.platformWrap}>
      <p className={styles.intro}>
        Documentation links for each AI platform. No content is reproduced here — links go
        directly to vendor and standards documentation. Check last-verified dates before acting.
      </p>

      {hasSelection && selectedData && (
        <div className={styles.platformSection}>
          <p className={styles.platformSectionLabel}>Your selected platform</p>
          <PlatformCard data={selectedData} highlight />
        </div>
      )}

      {(!hasSelection || otherPlatforms.length > 0) && (
        <div className={styles.platformSection}>
          <p className={styles.platformSectionLabel}>
            {hasSelection ? `Other platforms` : `All platforms`}
          </p>
          <div className={styles.platformGrid}>
            {otherPlatforms.map(([key, data]) => (
              <PlatformCard key={key} data={data} highlight={false} />
            ))}
          </div>
        </div>
      )}

      {!hasSelection && (
        <p className={styles.platformSkipNote}>
          No platform selected — showing all options. Return to{` `}
          <Link to="/configure" className={styles.extLink}>Configure</Link> to scope to your platform.
        </p>
      )}
    </div>
  )
}
