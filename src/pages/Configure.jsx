import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SYSTEM_CONFIG from '../data/system-config.json'
import { encodeConfig, decodeConfig } from '../engine/url-state.js'
import styles from './Configure.module.css'

// Build initial config from URL params (for "Edit" flow)
function buildInitialConfig(searchParams) {
  const decoded = decodeConfig(searchParams)
  if (decoded) return decoded
  return {
    system_type: null,
    context: { who: null, domain: null, decision_mode: null, build_path: null },
    data: { data_type: [], data_scale: null },
    jurisdiction: [],
    platform: null,
  }
}

// Step definitions mapping to system-config.json questions
const STEPS = [
  { id: 'system_type', label: 'System type', questionIndex: 0 },
  { id: 'context', label: 'Context', questionIndex: 1 },
  { id: 'data', label: 'Data', questionIndex: 2 },
  { id: 'jurisdiction', label: 'Jurisdiction', questionIndex: 3 },
  { id: 'platform', label: 'Platform', questionIndex: 4 },
]

export default function Configure() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [config, setConfig] = useState(() => buildInitialConfig(searchParams))
  const [expandedHelp, setExpandedHelp] = useState({})

  // Fire analytics event on mount
  useEffect(() => {
    if (window.plausible) window.plausible('baseline_started')
  }, [])

  function toggleHelp(key) {
    setExpandedHelp(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function setSystemType(value) {
    setConfig(c => ({ ...c, system_type: value }))
  }

  function setContextField(field, value) {
    setConfig(c => ({ ...c, context: { ...c.context, [field]: value } }))
  }

  function setDataType(value) {
    setConfig(c => {
      const current = c.data.data_type || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...c, data: { ...c.data, data_type: next } }
    })
  }

  function setDataScale(value) {
    setConfig(c => ({ ...c, data: { ...c.data, data_scale: value } }))
  }

  function setJurisdiction(value) {
    setConfig(c => {
      const current = c.jurisdiction || []
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...c, jurisdiction: next }
    })
  }

  function setPlatform(value) {
    setConfig(c => ({ ...c, platform: value }))
  }

  function canAdvance() {
    switch (step) {
      case 0: return !!config.system_type
      case 1: return !!(config.context.who && config.context.domain && config.context.decision_mode)
      case 2: return !!(config.data.data_type?.length && config.data.data_scale)
      case 3: return config.jurisdiction?.length > 0
      case 4: return true // platform is optional
      default: return false
    }
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      // Fire completion event, navigate to output
      if (window.plausible) window.plausible('baseline_completed')
      const params = encodeConfig(config)
      navigate(`/output?${params.toString()}`)
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  function handleSkip() {
    const params = encodeConfig(config)
    navigate(`/output?${params.toString()}`)
  }

  const q = SYSTEM_CONFIG.questions

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        {/* Progress stepper */}
        <div className={styles.stepper} role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length} aria-label="Configuration progress">
          {STEPS.map((s, i) => (
            <div key={s.id} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${i < step ? styles.done : i === step ? styles.active : ''}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${i === step ? styles.stepLabelActive : ''}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${i < step ? styles.lineDone : ''}`} />}
            </div>
          ))}
        </div>

        {/* Question area */}
        <div className={styles.questionCard}>
          {step === 0 && (
            <QuestionBlock
              question={q[0]}
              value={config.system_type}
              onSelect={setSystemType}
              expandedHelp={expandedHelp}
              onToggleHelp={toggleHelp}
              singleSelect
            />
          )}

          {step === 1 && (
            <div>
              {q[1].parts.map(part => (
                <QuestionPartBlock
                  key={part.id}
                  part={part}
                  value={part.id === 'who' ? config.context.who
                    : part.id === 'domain' ? config.context.domain
                    : part.id === 'decision_mode' ? config.context.decision_mode
                    : config.context.build_path}
                  onSelect={(val) => setContextField(
                    part.id === 'who' ? 'who'
                    : part.id === 'domain' ? 'domain'
                    : part.id === 'decision_mode' ? 'decision_mode'
                    : 'build_path',
                    val
                  )}
                  expandedHelp={expandedHelp}
                  onToggleHelp={toggleHelp}
                  singleSelect={part.type === 'single'}
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div>
              {q[2].parts.map(part => (
                <QuestionPartBlock
                  key={part.id}
                  part={part}
                  value={part.id === 'data_type' ? config.data.data_type : config.data.data_scale}
                  onSelect={(val) => part.id === 'data_type' ? setDataType(val) : setDataScale(val)}
                  expandedHelp={expandedHelp}
                  onToggleHelp={toggleHelp}
                  singleSelect={part.type === 'single'}
                  multiSelect={part.type === 'multi'}
                />
              ))}
            </div>
          )}

          {step === 3 && (
            <QuestionBlock
              question={q[3]}
              value={config.jurisdiction}
              onSelect={setJurisdiction}
              expandedHelp={expandedHelp}
              onToggleHelp={toggleHelp}
              multiSelect
            />
          )}

          {step === 4 && (
            <div>
              <QuestionBlock
                question={q[4]}
                value={config.platform}
                onSelect={setPlatform}
                expandedHelp={expandedHelp}
                onToggleHelp={toggleHelp}
                singleSelect
              />
              {q[4].phase2_note && (
                <p className={styles.phase2Note}>
                  ℹ️ {q[4].phase2_note}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          <div className={styles.navLeft}>
            {step > 0 && (
              <button onClick={handleBack} className={styles.btnBack}>
                ← Back
              </button>
            )}
          </div>
          <div className={styles.navRight}>
            {step === STEPS.length - 1 && (
              <button onClick={handleSkip} className={styles.btnSkip}>
                Skip platform →
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className={styles.btnNext}
            >
              {step < STEPS.length - 1 ? 'Continue →' : 'Get my baseline →'}
            </button>
          </div>
        </div>

        <p className={styles.navMeta}>
          Step {step + 1} of {STEPS.length}
          {' · '}
          <button onClick={handleSkip} className={styles.skipLink}>
            Skip to output with current answers
          </button>
        </p>
      </div>
    </div>
  )
}

function QuestionBlock({ question, value, onSelect, expandedHelp, onToggleHelp, singleSelect, multiSelect }) {
  const isSelected = (v) => {
    if (Array.isArray(value)) return value.includes(v)
    return value === v
  }

  return (
    <div className={styles.questionBlock}>
      {question.help_intro && (
        <p className={styles.questionHelpIntro}>{question.help_intro}</p>
      )}
      <h2 className={styles.questionLabel}>{question.label}</h2>
      {multiSelect && <p className={styles.multiHint}>Select all that apply</p>}
      <div className={styles.options}>
        {question.options.map(opt => (
          <OptionCard
            key={opt.value}
            opt={opt}
            selected={isSelected(opt.value)}
            onSelect={() => onSelect(opt.value)}
            helpKey={`${question.id}.${opt.value}`}
            expanded={expandedHelp[`${question.id}.${opt.value}`]}
            onToggleHelp={onToggleHelp}
          />
        ))}
      </div>
    </div>
  )
}

function QuestionPartBlock({ part, value, onSelect, expandedHelp, onToggleHelp, singleSelect, multiSelect }) {
  const isSelected = (v) => {
    if (Array.isArray(value)) return value.includes(v)
    return value === v
  }

  return (
    <div className={styles.questionBlock}>
      <h2 className={styles.questionLabel}>{part.label}</h2>
      {multiSelect && <p className={styles.multiHint}>Select all that apply</p>}
      {part.required === false && <p className={styles.multiHint}>Optional</p>}
      <div className={styles.options}>
        {part.options.map(opt => (
          <OptionCard
            key={opt.value}
            opt={opt}
            selected={isSelected(opt.value)}
            onSelect={() => onSelect(opt.value)}
            helpKey={`${part.id}.${opt.value}`}
            expanded={expandedHelp[`${part.id}.${opt.value}`]}
            onToggleHelp={onToggleHelp}
          />
        ))}
      </div>
    </div>
  )
}

function OptionCard({ opt, selected, onSelect, helpKey, expanded, onToggleHelp }) {
  return (
    <div
      className={`${styles.option} ${selected ? styles.optionSelected : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      aria-pressed={selected}
    >
      <div className={styles.optionTop}>
        <div className={styles.optionCheck}>
          {selected && <span className={styles.checkmark}>✓</span>}
        </div>
        <div className={styles.optionContent}>
          <span className={styles.optionLabel}>{opt.label}</span>
          {opt.help_short && (
            <span className={styles.optionHelpShort}>{opt.help_short}</span>
          )}
        </div>
      </div>

      {opt.help_long && (
        <div className={styles.optionHelpToggle}>
          <button
            className={styles.helpToggleBtn}
            onClick={(e) => { e.stopPropagation(); onToggleHelp(helpKey) }}
            aria-expanded={expanded}
          >
            {expanded ? 'Show less ↑' : 'Tell me more ↓'}
          </button>
          {expanded && (
            <p className={styles.optionHelpLong}>{opt.help_long}</p>
          )}
        </div>
      )}
    </div>
  )
}
