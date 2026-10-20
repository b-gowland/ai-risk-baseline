import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { classify } from '../../engine/classify.js'
import V2Disclaimer from '../components/V2Disclaimer.jsx'
import { decodeAnswers, toSearch } from '../url-state.js'
import { isComplete } from '../flow.js'
import {
  statusLabel, scopeLabel, roleLabel, basesLabels, keyDates, tierInfo, tierExpectations,
  openQuestionText, hasRequirements, requirementsByGate, obligationsByRole, firstActions, formatDate,
  purposeById, midSentence,
} from '../present.js'
import { buildExportModel, toMarkdown, toCsv } from '../export.js'
import styles from './OutputV2.module.css'

const STATUS_TONE = {
  prohibited: 'danger',
  high_risk: 'danger',
  not_high_risk_6_3: 'warn',
  transparency: 'warn',
  minimal: 'ok',
  out_of_scope: 'neutral',
}

function download(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const slug = s => (s || 'use-case').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'use-case'

export default function OutputV2() {
  const [searchParams] = useSearchParams()
  const decoded = useMemo(() => decodeAnswers(searchParams), [searchParams])
  const today = new Date().toISOString().slice(0, 10)
  const result = useMemo(() => (decoded ? classify(decoded.answers, { today }) : null), [decoded, today])
  const [copied, setCopied] = useState(false)

  if (!decoded || !decoded.answers.purpose) {
    return (
      <>
        <V2Disclaimer />
        <div className={styles.empty}>
          <p className={styles.eyebrow}>Use-case baseline · v2 preview</p>
          <h1 className={styles.emptyTitle}>No answers yet</h1>
          <p className={styles.lead}>Answer a few questions about one AI use case to get its EU AI Act classification, governance tier and first actions.</p>
          <Link to="/v2/configure" className={styles.btnPrimary}>Start the questionnaire</Link>
        </div>
      </>
    )
  }

  const { answers, name } = decoded
  const editHref = `/v2/configure${toSearch(answers, name)}`
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const blocking = result.open_questions.filter(q => q.blocking)
  const tone = STATUS_TONE[result.status] || 'neutral'
  const tier = tierInfo(result.tier)
  const actions = firstActions(result)
  const dates = keyDates(result)
  const bases = basesLabels(result)
  const purpose = answers.purpose === 'unsure' ? 'Intended purpose not yet confirmed' : purposeById(answers.purpose)?.label
  const complete = isComplete(answers)

  const exportModel = () => buildExportModel({ answers, name, result, url: shareUrl, today })
  const base = `baseline-${slug(name)}`
  const exportMd = () => download(`${base}.md`, toMarkdown(exportModel(), result), 'text/markdown;charset=utf-8')
  const exportJson = () => download(`${base}.json`, JSON.stringify(exportModel(), null, 2), 'application/json')
  const exportCsv = () => download(`${base}.csv`, toCsv(exportModel(), result), 'text/csv;charset=utf-8')
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <V2Disclaimer />
      <div className={styles.page}>
        <div className={styles.inner}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Use-case baseline · v2 preview</p>
            <h1 className={styles.title}>{name || 'Your AI use case'}</h1>
            <p className={styles.lead}>{purpose}</p>
            <div className={`${styles.headerActions} no-print`}>
              <Link to={editHref} className={styles.btnSecondary}>Edit answers</Link>
              <button type="button" className={styles.btnSecondary} onClick={copyLink}>{copied ? 'Link copied' : 'Copy link'}</button>
              <span className="sr-only" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
            </div>
          </header>

          {!complete && (
            <p className={styles.partial}>
              Some questions are unanswered and are treated as Unsure. <Link to={editHref}>Answer them</Link> for a firmer result.
            </p>
          )}

          {/* 1. Blocking open questions */}
          {blocking.length > 0 && (
            <section className={styles.blocking} aria-labelledby="blocking-heading">
              <h2 id="blocking-heading" className={styles.blockingTitle}>Resolve before go-live</h2>
              <ul className={styles.blockingList}>
                {blocking.map(q => (
                  <li key={q.gate}>
                    <strong>{openQuestionText(q).ask}</strong> Until resolved: {midSentence(q.assumption)}.
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 2. Classification card */}
          <section className={`${styles.card} ${styles[`tone_${tone}`]}`} aria-labelledby="classification-heading">
            <p className={styles.sectionEyebrow} id="classification-heading">EU AI Act classification</p>
            <p className={styles.status}>
              {statusLabel(result)}
              {result.provisional && <span className={styles.badgeProvisional}>Provisional</span>}
            </p>
            {result.provisional && (
              <p className={styles.provisionalNote}>Based on conservative assumptions for the questions you were unsure about. See the open questions below.</p>
            )}
            <dl className={styles.facts}>
              {bases.length > 0 && (
                <div className={styles.fact}><dt>Basis</dt><dd>{bases.join('; ')}</dd></div>
              )}
              <div className={styles.fact}><dt>Scope</dt><dd>{scopeLabel(result.scope)}</dd></div>
              <div className={styles.fact}>
                <dt>Your role</dt>
                <dd>{result.roles.length ? result.roles.map(roleLabel).join(', ') : 'None under the EU AI Act'}</dd>
              </div>
              {dates.length > 0 && (
                <div className={styles.fact}>
                  <dt>Key dates</dt>
                  <dd>
                    <ul className={styles.dates}>
                      {dates.map(d => (
                        <li key={d.date}><span className={styles.date}>{d.label}</span> {d.refs.join(', ')}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            {result.notes.length > 0 && (
              <ul className={styles.notes}>
                {result.notes.map(n => (
                  <li key={n.text}><span className={styles.ref}>{n.ref}</span> {n.text}</li>
                ))}
              </ul>
            )}
            <details className={styles.trace}>
              <summary>Because: how this was decided ({result.trace.length} steps)</summary>
              <ol className={styles.traceList}>
                {result.trace.map((t, i) => (
                  <li key={i}>
                    <span className={styles.traceRule}>{t.rule}</span>
                    <span className={styles.traceBecause}>
                      {t.because.map(b => <code key={b} className={styles.chip}>{b}</code>)}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </section>

          {/* 3. Governance tier */}
          <section className={styles.section} aria-labelledby="tier-heading">
            <h2 id="tier-heading" className={styles.h2}>
              Governance tier <span className={styles.tierBadge}>{result.tier === 'P' ? 'P' : `${result.tier} of 4`}</span> {tier.name}
            </h2>
            <p className={styles.lead}>{tier.summary}</p>
            {tierExpectations(result.tier).length > 0 && (
              <div className={styles.tierGrid}>
                {tierExpectations(result.tier).map(t => (
                  <div key={t.tier} className={styles.tierCol}>
                    <h3 className={styles.h3}>Tier {t.tier}: {t.name}</h3>
                    <ul className={styles.bullets}>
                      {t.items.map(e => <li key={e}>{e}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            <p className={styles.small}>The tier is framework-neutral: it comes from the worst plausible harm and the level of autonomy, raised for vulnerable people and sensitive data, with EU high-risk as a floor of 3.</p>
          </section>

          {/* 4. First 5 actions */}
          <section className={styles.section} aria-labelledby="actions-heading">
            <h2 id="actions-heading" className={styles.h2}>First actions</h2>
            {actions.derived && <p className={styles.small}>Derived from your open questions and governance tier.</p>}
            <ol className={styles.actions}>
              {actions.items.map(a => (
                <li key={a.rank} className={styles.action}>
                  <span className={styles.actionRank} aria-hidden="true">{a.rank}</span>
                  <div>
                    <p className={styles.actionTitle}>{a.title}</p>
                    {a.why && <p className={styles.actionWhy}>{a.why}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* 5. Requirements by gate (or EU obligations by role until the library lands) */}
          <section className={styles.section} aria-labelledby="req-heading">
            {hasRequirements(result) ? (
              <>
                <h2 id="req-heading" className={styles.h2}>Requirements by gate</h2>
                {requirementsByGate(result).map(g => (
                  <div key={g.gate} className={styles.reqGroup}>
                    <h3 className={styles.h3}>{g.label}</h3>
                    <ul className={styles.reqList}>
                      {g.items.map(r => <Requirement key={r.id} r={r} />)}
                    </ul>
                  </div>
                ))}
              </>
            ) : (
              <>
                <h2 id="req-heading" className={styles.h2}>EU AI Act obligations by role</h2>
                <p className={styles.small}>The full requirements library (ISO/IEC 42001, NIST AI RMF and EU AI Act, by lifecycle gate) is coming. Until then, these are your EU AI Act obligations.</p>
                {obligationsByRole(result).length === 0 && <p className={styles.lead}>None for your role.</p>}
                {obligationsByRole(result).map(g => (
                  <div key={g.role} className={styles.reqGroup}>
                    <h3 className={styles.h3}>{g.label}</h3>
                    <ul className={styles.oblList}>
                      {g.items.map(o => (
                        <li key={o.id} className={styles.obl}>
                          <span className={styles.ref}>{o.citation}</span>
                          <span className={styles.oblTitle}>{o.title}</span>
                          {o.effective_from && <span className={styles.oblDate}>from {formatDate(o.effective_from)}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* 6. Open questions */}
          <section className={styles.section} aria-labelledby="oq-heading">
            <h2 id="oq-heading" className={styles.h2}>Open questions to escalate</h2>
            {result.open_questions.length === 0
              ? <p className={styles.lead}>None. Every answer that drives the classification was given.</p>
              : (
                <ul className={styles.oqList}>
                  {result.open_questions.map(q => {
                    const t = openQuestionText(q)
                    return (
                      <li key={`${q.gate}|${q.field}`} className={styles.oq}>
                        <p className={styles.oqAsk}>
                          {t.ask} {q.blocking && <span className={styles.badgeBlocking}>Blocking</span>}
                        </p>
                        <p className={styles.oqMeta}><span>Ask: {t.who}</span> <span>Assumed meanwhile: {midSentence(q.assumption)}</span></p>
                      </li>
                    )
                  })}
                </ul>
              )}
          </section>

          {/* 7. Exports */}
          <section className={`${styles.section} no-print`} aria-labelledby="export-heading">
            <h2 id="export-heading" className={styles.h2}>Export</h2>
            <p className={styles.small}>The link is the save format. Exports carry the answers, the result and the trace; JSON and CSV are for import into GRC tools.</p>
            <div className={styles.exports}>
              <button type="button" className={styles.btnSecondary} onClick={exportMd}>Markdown</button>
              <button type="button" className={styles.btnSecondary} onClick={exportJson}>JSON</button>
              <button type="button" className={styles.btnSecondary} onClick={exportCsv}>CSV</button>
              <button type="button" className={styles.btnSecondary} onClick={() => window.print()}>Print</button>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function Requirement({ r }) {
  return (
    <li className={styles.req}>
      <div className={styles.reqHead}>
        <span className={styles.reqTitle}>{r.title}</span>
        <span className={styles.badge}>{r.level === 'org' ? 'Organisation' : 'Use case'}</span>
      </div>
      {r.summary && <p className={styles.reqText}>{r.summary}</p>}
      {r.why && <p className={styles.reqText}><strong>Why:</strong> {r.why}</p>}
      <dl className={styles.reqFacts}>
        {r.artefact && <div><dt>Artefact</dt><dd>{r.artefact}</dd></div>}
        {r.owners?.length > 0 && <div><dt>Owner</dt><dd>{r.owners.join(', ')}</dd></div>}
        {r.effort && <div><dt>Effort</dt><dd>{r.effort}</dd></div>}
        {r.effective_from && <div><dt>Applies from</dt><dd>{formatDate(r.effective_from)}</dd></div>}
      </dl>
      {r.sources?.length > 0 && (
        <p className={styles.sources}>
          {r.sources.map((s, i) => (
            <span key={i} className={styles.source}>
              {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.framework} {s.ref}</a> : `${s.framework} ${s.ref}`}
            </span>
          ))}
        </p>
      )}
    </li>
  )
}
