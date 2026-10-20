/**
 * Examples.jsx
 * Gallery of worked examples. Each card is a golden scenario (src/v2/golden/scenarios.json):
 * its link carries the scenario's answers, and its status, tier and role tags come from
 * the engine, so the cards always match what the output page shows.
 */

import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { trackEvent } from '../utils/analytics.js'
import { classify } from '../v2/engine/classify.js'
import { toSearch } from '../v2/ui/url-state.js'
import { statusLabel, roleLabel } from '../v2/ui/present.js'
import SUITE from '../v2/golden/scenarios.json'
import styles from './Examples.module.css'

const EXAMPLES = [
  {
    scenario: `G09`,
    eyebrow: `Financial services · Built in-house`,
    title: `Automated consumer credit scoring`,
    description: `A bank builds and runs its own model that approves or declines consumer loans without case-by-case review. A listed high-risk use (Annex III 5(b)), so the bank carries provider and deployer duties, including a fundamental rights impact assessment.`,
  },
  {
    scenario: `G10`,
    eyebrow: `Financial services · Built in-house`,
    title: `Card fraud detection`,
    description: `A transaction fraud model that blocks suspicious payments automatically. Fraud detection is expressly carved out of the credit-scoring category, so it is not high-risk under the EU AI Act, but its autonomy and impact still call for enhanced governance.`,
  },
  {
    scenario: `G25`,
    eyebrow: `Retail · Vendor chatbot`,
    title: `Customer-service chatbot`,
    description: `A company deploys a vendor's LLM chatbot on its website. The Art. 50 duty to tell people they are talking to AI sits with the vendor as provider; the company checks it is met and covers its own deployer duties.`,
  },
  {
    scenario: `G17`,
    eyebrow: `Employment · Agent built on a third-party LLM`,
    title: `Automated CV screening agent`,
    description: `An in-house agent screens applications and decides who progresses. Recruitment is a listed high-risk use (Annex III 4(a)); building on a third-party model does not make the company a general-purpose model provider.`,
  },
  {
    scenario: `G35`,
    eyebrow: `Healthcare · Medical device`,
    title: `Radiology triage software`,
    description: `Software that prioritises scans and is itself a class IIa medical device. High-risk through the product route (Art. 6(1), Annex I), applying from 2 August 2028.`,
  },
  {
    scenario: `G14`,
    eyebrow: `Public sector · Vendor system`,
    title: `Welfare benefit eligibility`,
    description: `A welfare agency scores eligibility for benefits, affecting vulnerable claimants. High-risk (Annex III 5(a)) with public-authority duties to register the use and assess fundamental rights impact. Governance tier 4.`,
  },
  {
    scenario: `G01`,
    eyebrow: `Employment · Vendor tool`,
    title: `Emotion recognition of employees`,
    description: `A vendor tool infers staff emotions from video. Prohibited in the workplace (Art. 5(1)(f)) unless used for medical or safety reasons: the output says stop and escalate.`,
  },
  {
    scenario: `G47`,
    eyebrow: `Early idea · Almost everything unsure`,
    title: `An idea at the very start`,
    description: `Purpose, role and EU nexus are all still unknown. Instead of an empty result, the Baseline lists the open questions to resolve and shows a provisional, cautious baseline in the meantime.`,
  },
]

const today = new Date().toISOString().slice(0, 10)
const CARDS = EXAMPLES.map(ex => {
  const scenario = SUITE.scenarios.find(s => s.id === ex.scenario)
  const answers = { ...SUITE.defaults, ...scenario.answers }
  const result = classify(answers, { today })
  const tags = [
    `${statusLabel(result)}${result.provisional ? ` (provisional)` : ``}`,
    ...(result.tier === `P` ? [] : [`Tier ${result.tier}`]),
    ...result.roles.map(roleLabel),
  ]
  return { ...ex, tags, url: `/output${toSearch(answers, ex.title)}` }
})

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
            Eight use cases from the Baseline's test scenarios, chosen to show how the classification
            handles high-risk uses, carve-outs, vendor roles, product rules, prohibitions and unknowns.
            Each opens a live output you can explore, share, or adapt.
          </p>
        </div>

        <div className={styles.grid}>
          {CARDS.map(ex => (
            <div key={ex.scenario} className={styles.card}>
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
                  <span className={styles.persona}>Scenario {ex.scenario}</span>
                  <Link
                    to={ex.url}
                    className={styles.viewBtn}
                    onClick={() => trackEvent(`example_viewed`, { example_id: ex.scenario })}
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
            Want to assess your own use case?{` `}
            <Link to="/configure" className={styles.footerLink}>Start the questionnaire →</Link>
          </p>
        </div>

      </div>
    </div>
  )
}
