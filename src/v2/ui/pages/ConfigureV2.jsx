import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import V2Disclaimer from '../components/V2Disclaimer.jsx'
import { Question, PurposeQuestion, MapRows, Art63Question } from '../components/Questions.jsx'
import {
  visibleGates, isFieldVisible, missingInGate, visiblePractices, unansweredPractices,
  isComplete, pruneHidden, FIELD_BY_ID,
} from '../flow.js'
import { encodeAnswers, decodeAnswers, toSearch, NAME_MAX } from '../url-state.js'
import { FIELD_TITLES, valueLabel } from '../labels.js'
import { purposeById, formatDate } from '../present.js'
import styles from './ConfigureV2.module.css'

const today = () => new Date().toISOString().slice(0, 10)

function practiceRows(practices) {
  return practices.map(p => ({
    key: p.id,
    eyebrow: p.effective_from > today() ? `${p.citation} · applies from ${formatDate(p.effective_from)}` : p.citation,
    title: p.title,
    text: p.question,
  }))
}

function answerSummary(fieldId, answers) {
  const v = answers[fieldId]
  const f = FIELD_BY_ID.get(fieldId)
  if (v === undefined) return 'Not answered'
  if (fieldId === 'purpose') return v === 'unsure' ? 'Unsure' : purposeById(v)?.label || v
  if (fieldId === 'prohibited') {
    const shown = visiblePractices(answers)
    if (!shown.length) return 'No items apply'
    const yes = shown.filter(p => v[p.id] === 'yes').map(p => p.title)
    const unsure = shown.filter(p => v[p.id] === 'unsure').map(p => p.title)
    const parts = []
    if (yes.length) parts.push(`Yes: ${yes.join(', ')}`)
    if (unsure.length) parts.push(`Unsure: ${unsure.join(', ')}`)
    return parts.join('. ') || (shown.length === 1 ? 'No' : `No to all ${shown.length} items`)
  }
  if (f.type === 'map') {
    const yes = f.keys.filter(k => v[k] === 'yes').map(k => valueLabel('art_6_3', k))
    const unsure = f.keys.filter(k => v[k] === 'unsure').map(k => valueLabel('art_6_3', k))
    const parts = []
    if (yes.length) parts.push(`Yes: ${yes.join(', ')}`)
    if (unsure.length) parts.push(`Unsure: ${unsure.join(', ')}`)
    return parts.join('. ') || 'No to all'
  }
  if (Array.isArray(v)) return v.length ? v.map(x => valueLabel(fieldId, x)).join(', ') : 'None'
  return valueLabel(fieldId, v)
}

function startGate(answers) {
  if (!answers.purpose) return 'purpose'
  return isComplete(answers) ? 'review' : (visibleGates(answers).find(g => missingInGate(g, answers).length)?.id || 'review')
}

export default function ConfigureV2() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const initial = useMemo(() => decodeAnswers(searchParams) || { answers: {}, name: '' }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [answers, setAnswers] = useState(initial.answers)
  const [name, setName] = useState(initial.name)
  const [gateId, setGateId] = useState(() => startGate(initial.answers))
  const [visited, setVisited] = useState(() => new Set([gateId]))
  const [showMissing, setShowMissing] = useState(false)
  const headingRef = useRef(null)
  const firstRender = useRef(true)

  const gates = visibleGates(answers)
  const index = Math.max(0, gates.findIndex(g => g.id === gateId))
  const gate = gates[index]

  // Keep the URL in step with the answers, so a refresh or a shared link resumes here.
  useEffect(() => {
    setSearchParams(encodeAnswers(answers, name), { replace: true })
  }, [answers, name, setSearchParams])

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [gateId])

  const setAnswer = (fieldId, value) => {
    setAnswers(a => {
      const next = { ...a }
      if (value === undefined) delete next[fieldId]
      else next[fieldId] = value
      return next
    })
  }

  const goTo = id => {
    setShowMissing(false)
    setGateId(id)
    setVisited(v => new Set([...v, id]))
  }

  const missing = gate.id === 'prohibited'
    ? unansweredPractices(answers).map(p => p.id)
    : missingInGate(gate, answers)

  const handleNext = () => {
    if (missing.length) { setShowMissing(true); return }
    goTo(gates[index + 1].id)
  }

  const handleSubmit = () => {
    if (!isComplete(answers)) { setShowMissing(true); return }
    navigate(`/v2/output${toSearch(pruneHidden(answers), name)}`)
  }

  const deployerOnly = Array.isArray(answers.role) && answers.role.length > 0 && answers.role.every(r => r === 'deploy_vendor')

  return (
    <>
      <V2Disclaimer />
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Use-case baseline · v2 preview</p>

          <nav aria-label="Questionnaire gates" className={styles.progress}>
            <p className={styles.progressText}>
              Gate {index + 1} of {gates.length}: <strong>{gate.label}</strong>
            </p>
            <div className={styles.bar} aria-hidden="true">
              <div className={styles.barFill} style={{ width: `${((index + 1) / gates.length) * 100}%` }} />
            </div>
            <ol className={styles.gates}>
              {gates.map((g, i) => {
                const current = g.id === gate.id
                const reachable = visited.has(g.id) || i < index
                return (
                  <li key={g.id}>
                    <button type="button" className={`${styles.gateBtn} ${current ? styles.gateCurrent : ''} ${i < index ? styles.gateDone : ''}`}
                      aria-current={current ? 'step' : undefined} disabled={!reachable || current}
                      onClick={() => goTo(g.id)}>
                      <span className={styles.gateNum} aria-hidden="true">{i + 1}</span>
                      {g.label}
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <section className={styles.card} aria-labelledby="gate-heading">
            <h2 id="gate-heading" ref={headingRef} tabIndex={-1} className={styles.gateHeading}>{gate.label}</h2>

            {gate.id === 'purpose' && (
              <>
                <div className={styles.nameField}>
                  <label htmlFor="usecase-name" className={styles.nameLabel}>Use-case name <span className={styles.optional}>(optional)</span></label>
                  <input id="usecase-name" type="text" className={styles.nameInput} value={name} maxLength={NAME_MAX}
                    onChange={e => setName(e.target.value)} placeholder="e.g. Loan pre-approval model" />
                </div>
                <PurposeQuestion value={answers.purpose} onChange={v => setAnswer('purpose', v)}
                  missing={showMissing && missing.includes('purpose')} />
              </>
            )}

            {gate.id === 'prohibited' && (
              <div>
                <p className={styles.intro}>
                  The EU AI Act bans a short list of practices outright (Art. 5). Only the items relevant to your purpose are shown.
                  Answer each one; "Unsure" is treated as potentially prohibited and blocks go-live until resolved.
                </p>
                {visiblePractices(answers).length ? (
                  <MapRows name="prohibited" rows={practiceRows(visiblePractices(answers))} value={answers.prohibited}
                    onChange={v => setAnswer('prohibited', v)} missingKeys={showMissing ? missing : []} />
                ) : (
                  <p className={styles.empty}>No prohibited-practice items apply to this purpose so far. Later answers about technology and interaction can add some; you'll see them at Review.</p>
                )}
              </div>
            )}

            {gate.id === 'art_6_3' && (
              <Art63Question value={answers.art_6_3} onChange={v => setAnswer('art_6_3', v)} deployerOnly={deployerOnly}
                missingKeys={showMissing && missing.includes('art_6_3') ? FIELD_BY_ID.get('art_6_3').keys.filter(k => !(answers.art_6_3 || {})[k]) : []} />
            )}

            {!['purpose', 'prohibited', 'art_6_3', 'review'].includes(gate.id) && gate.fields
              .filter(id => isFieldVisible(id, answers))
              .map(id => (
                <Question key={id} fieldId={id} answers={answers} setAnswer={setAnswer}
                  missing={showMissing && missing.includes(id)} />
              ))}

            {gate.id === 'review' && (
              <Review answers={answers} gates={gates} goTo={goTo} setAnswer={setAnswer} showMissing={showMissing} />
            )}
          </section>

          {showMissing && missing.length > 0 && (
            <p className={styles.blocked} role="alert">
              {missing.length === 1 ? '1 question needs' : `${missing.length} questions need`} an answer before you continue. Unsure is always an option.
            </p>
          )}

          <div className={styles.nav}>
            {index > 0
              ? <button type="button" className={styles.btnBack} onClick={() => goTo(gates[index - 1].id)}>Back</button>
              : <span />}
            {gate.id === 'review'
              ? <button type="button" className={styles.btnNext} onClick={handleSubmit}>See your baseline</button>
              : <button type="button" className={styles.btnNext} onClick={handleNext}>Continue</button>}
          </div>
        </div>
      </div>
    </>
  )
}

function Review({ answers, gates, goTo, setAnswer, showMissing }) {
  const late = unansweredPractices(answers)
  const incomplete = gates.filter(g => g.id !== 'review' && g.id !== 'prohibited' && missingInGate(g, answers).length)
  return (
    <div>
      {late.length > 0 && (
        <div className={styles.lateScreen}>
          <h3 className={styles.subheading}>Your later answers make these screening items relevant</h3>
          <MapRows name="prohibited-late" rows={practiceRows(late)} value={answers.prohibited}
            onChange={v => setAnswer('prohibited', v)} missingKeys={showMissing ? late.map(p => p.id) : []} />
        </div>
      )}
      {incomplete.length > 0 && (
        <p className={styles.blocked}>
          Unanswered questions in: {incomplete.map((g, i) => (
            <span key={g.id}>{i > 0 && ', '}<button type="button" className={styles.linkBtn} onClick={() => goTo(g.id)}>{g.label}</button></span>
          ))}.
        </p>
      )}
      <p className={styles.intro}>Check your answers. You can change any of them; the result and its link update when you continue.</p>
      <dl className={styles.summary}>
        {gates.filter(g => g.id !== 'review').map(g => (
          <div key={g.id} className={styles.summaryGate}>
            <div className={styles.summaryHead}>
              <h3 className={styles.summaryTitle}>{g.label}</h3>
              <button type="button" className={styles.linkBtn} onClick={() => goTo(g.id)}>
                Change<span className="sr-only"> {g.label}</span>
              </button>
            </div>
            {g.fields.filter(id => isFieldVisible(id, answers)).map(id => (
              <div key={id} className={styles.summaryRow}>
                <dt>{FIELD_TITLES[id]}</dt>
                <dd>{answerSummary(id, answers)}</dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
    </div>
  )
}

