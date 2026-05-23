/**
 * Examples.jsx
 * Gallery of worked examples — four pre-configured Baseline outputs.
 * Each card links directly to /output?... with the example's URL state.
 * The original /example route (credit decisioning) is preserved separately.
 *
 * Configs verified against system-config.json options May 22, 2026.
 */

import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { trackEvent } from '../utils/analytics.js'
import styles from './Examples.module.css'

const EXAMPLES = [
  {
    id: `credit_decisioning`,
    eyebrow: `Financial services · EU + AU · Predictive`,
    title: `Credit decisioning system`,
    description: `A bank's automated credit-scoring model used for customer loan decisions. Customer-facing, fully automated, processing personal financial data at scale. The highest-obligation configuration in the Baseline — triggers EU AI Act Annex III high-risk classification, Article 86 right to explanation, APRA CPS 230, and GDPR Article 22.`,
    persona: `Sarah — risk lead, APAC bank`,
    tags: [`EU AI Act`, `GDPR`, `APRA CPS 230`, `AU Privacy Act`],
    url: `/output?v=1&st=predictive&who=customer_facing&dom=financial_services&dm=automated_decision&bp=in_house&dt=personal_financial%2Cpersonal_basic&ds=10k_100k&juris=eu%2Cau&plat=skip`,
  },
  {
    id: `llm_internal_tool`,
    eyebrow: `Financial services · AU · LLM / chatbot`,
    title: `LLM internal support tool`,
    description: `An LLM-powered assistant deployed for internal staff — helping relationship managers draft customer communications, summarise documents, and look up policy. Employee-facing, recommendation-only (human makes the final call), procured from a vendor. Lower regulatory exposure than customer-facing systems, but data governance, vendor due diligence, and AI literacy obligations still apply.`,
    persona: `Marcus — operations manager, mid-tier bank`,
    tags: [`AU Privacy Act`, `AU Voluntary AI Standard`, `OWASP LLM Top 10`],
    url: `/output?v=1&st=llm_chatbot&who=employee_facing&dom=financial_services&dm=recommendation_only&bp=vendor&dt=personal_basic%2Cpersonal_financial&ds=10k_100k&juris=au&plat=skip`,
  },
  {
    id: `radiology_triage`,
    eyebrow: `Healthcare · EU + AU · Predictive`,
    title: `Radiology triage AI`,
    description: `A predictive AI system that prioritises radiology scan queues, flagging likely urgent cases for faster clinician review. Clinician-facing, decision-support (radiologist makes the final read), processing health and special-category personal data. EU AI Act Annex III classifies this as high-risk. GDPR special-category rules apply. Australian Privacy Principles apply to health data.`,
    persona: `Dr Anya — clinical informatics lead, hospital network`,
    tags: [`EU AI Act Annex III`, `GDPR Art. 9`, `AU Privacy Act`, `ISO/IEC 42001`],
    url: `/output?v=1&st=predictive&who=clinician_facing&dom=healthcare&dm=decision_support&bp=vendor&dt=personal_health%2Cspecial_category&ds=10k_100k&juris=eu%2Cau&plat=skip`,
  },
  {
    id: `hr_screening`,
    eyebrow: `HR / employment · AU + UK · Automated decision`,
    title: `Automated CV screening`,
    description: `An AI system that screens job applications and ranks candidates before a human recruiter reviews a shortlist. Employee-facing (affects job applicants), decision-support model, vendor-procured, processing basic personal and HR data. EU AI Act Annex III lists recruitment AI as high-risk. UK Data Use and Access Act 2025 automated-decision provisions apply. AU Privacy Act governs candidate data.`,
    persona: `Jordan — HR systems lead, professional services firm`,
    tags: [`EU AI Act Annex III`, `UK DUA Act 2025`, `AU Privacy Act`, `NIST AI RMF`],
    url: `/output?v=1&st=automated_decision&who=employee_facing&dom=hr_employment&dm=decision_support&bp=vendor&dt=personal_basic%2Cpersonal_hr&ds=1k_10k&juris=au%2Cuk&plat=skip`,
  },
  {
    id: `public_sector_eligibility`,
    eyebrow: `Public sector · AU · Automated decision`,
    title: `Public-sector eligibility assessment`,
    description: `A government agency's system that automatically determines eligibility for a benefit or service — processing applications at scale with no human review of individual decisions. Customer-facing, fully automated, built in-house, processing basic personal and financial data for 100K+ people per year. High accountability expectations. APRA-equivalent prudential framing does not apply, but AU Privacy Act, the Voluntary AI Safety Standard, and administrative law accountability obligations do.`,
    persona: `Claire — digital transformation lead, federal agency`,
    tags: [`AU Privacy Act`, `AU Voluntary AI Standard`, `NIST AI RMF`, `ISO/IEC 42001`],
    url: `/output?v=1&st=automated_decision&who=customer_facing&dom=public_sector&dm=automated_decision&bp=in_house&dt=personal_basic%2Cpersonal_financial&ds=100k_plus&juris=au&plat=skip`,
  },
]

export default function Examples() {
  useEffect(() => {
    trackEvent(`examples_gallery_viewed`)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.inner}>

        <div className={styles.header}>
          <p className={styles.eyebrow}>— AI GOVERNANCE BASELINE</p>
          <h1 className={styles.title}>Worked examples</h1>
          <p className={styles.subtitle}>
            Five pre-configured outputs showing the Baseline applied to real deployment scenarios.
            Each links to a live output you can explore, share, or adapt.
          </p>
        </div>

        <div className={styles.grid}>
          {EXAMPLES.map(ex => (
            <div key={ex.id} className={styles.card}>
              <div className={styles.cardTop}>
                <p className={styles.cardEyebrow}>{ex.eyebrow}</p>
                <h2 className={styles.cardTitle}>{ex.title}</h2>
                <p className={styles.cardDesc}>{ex.description}</p>
              </div>
              <div className={styles.cardBottom}>
                <div className={styles.tags}>
                  {ex.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
                <div className={styles.cardFooter}>
                  <span className={styles.persona}>{ex.persona}</span>
                  <Link
                    to={ex.url}
                    className={styles.viewBtn}
                    onClick={() => trackEvent(`example_viewed`, { example_id: ex.id })}
                  >
                    View example →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Want to run the tool for your own system?{` `}
            <Link to="/configure" className={styles.footerLink}>Start with your configuration →</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
