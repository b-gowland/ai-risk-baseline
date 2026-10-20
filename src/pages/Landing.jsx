import { Link } from 'react-router-dom'
import changelog from '../data/changelog.json'
import styles from './Landing.module.css'

// Worked examples gallery URL
const EXAMPLE_URL = `/examples`

// Most recent content update, from the changelog
const LATEST = changelog.entries[0]
const LATEST_DATE = LATEST
  ? new Date(`${LATEST.date}T00:00:00Z`).toLocaleDateString(`en-GB`, { day: `numeric`, month: `long`, year: `numeric`, timeZone: `UTC` })
  : null

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>——— AI RISK PRACTICE · BASELINE</p>
          <h1 className={styles.heroTitle}>
            Someone has brought you an AI use case.<br />
            <em>Know where you stand in ten minutes.</em>
          </h1>
          <p className={styles.heroSub}>
            Answer plain-language questions about what the system is for, your role and its impact.
            Get its EU AI Act classification, a governance tier, the requirements that apply,
            crosswalked to ISO/IEC 42001 and the NIST AI RMF, and your first five actions,
            plus a list of what to escalate. Free. No signup.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/configure" className={styles.btnPrimary}>
              Assess a use case →
            </Link>
            <Link to={EXAMPLE_URL} className={styles.btnSecondary}>
              See worked examples
            </Link>
          </div>
          <p className={styles.heroMeta}>
            Takes about 10 minutes · Your answers stay in your browser · Open source
          </p>
          {LATEST && (
            <Link to="/changelog" className={styles.heroFresh}>
              Updated {LATEST_DATE}: {LATEST.title} →
            </Link>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.howInner}>
          <p className={styles.sectionEyebrow}>——— HOW IT WORKS</p>
          <h2 className={styles.sectionTitle}>From use case to governance baseline</h2>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <h3 className={styles.stepTitle}>Describe the use case</h3>
              <p className={styles.stepText}>
                Start with its intended purpose, then work through short gates: prohibited practices,
                EU scope, your role, product and high-risk questions, transparency, impact and data.
                Questions appear only when they matter, and every one has an "Unsure" option.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <h3 className={styles.stepTitle}>Get your baseline</h3>
              <p className={styles.stepText}>
                Your EU AI Act status with the reasoning behind it, a governance tier from 1 to 4,
                requirements grouped by lifecycle gate, each with the artefact it produces,
                and five first actions in the order to do them.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <h3 className={styles.stepTitle}>Bring it to the room</h3>
              <p className={styles.stepText}>
                Your answers are encoded in the link: share it with Legal, Risk or Technology.
                Export as Markdown for Confluence or Notion, JSON for your tooling,
                or CSV for your GRC register.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className={styles.what}>
        <div className={styles.whatInner}>
          <p className={styles.sectionEyebrow}>——— WHAT YOU'LL GET</p>
          <h2 className={styles.sectionTitle}>A baseline, not a checklist</h2>
          <div className={styles.whatGrid}>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">EU</span>
              <div>
                <h3 className={styles.whatTitle}>EU AI Act classification</h3>
                <p className={styles.whatText}>
                  Prohibited, high-risk (and on which basis), Art. 6(3) exemption, transparency
                  obligations or minimal risk, plus your role as provider or deployer. Every result shows
                  the answers and articles that produced it.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">TIER</span>
              <div>
                <h3 className={styles.whatTitle}>Governance tier</h3>
                <p className={styles.whatText}>
                  How much governance the use case needs, from worst plausible harm and autonomy,
                  whether or not the EU AI Act applies. The rules are published, so you can map
                  them to your own risk appetite.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">REQ</span>
              <div>
                <h3 className={styles.whatTitle}>Requirements with a crosswalk</h3>
                <p className={styles.whatText}>
                  Requirements by lifecycle gate, each with an owner, effort, the artefact it produces
                  and its references in the EU AI Act, ISO/IEC 42001, 23894 and 42005, and the
                  NIST AI RMF and Generative AI Profile.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">ACT</span>
              <div>
                <h3 className={styles.whatTitle}>First five actions</h3>
                <p className={styles.whatText}>
                  The order to start in: record the classification, inventory, assessment,
                  the item that blocks go-live, then monitoring and incidents.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">PACK</span>
              <div>
                <h3 className={styles.whatTitle}>Country packs</h3>
                <p className={styles.whatText}>
                  Data protection on top of the core: GDPR when the system reaches the EU and uses
                  personal data, plus UK data protection law as amended in 2026 and Australia's
                  Privacy Act and national AI guidance when you select them.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon} aria-hidden="true">ASK</span>
              <div>
                <h3 className={styles.whatTitle}>Open questions to escalate</h3>
                <p className={styles.whatText}>
                  Anything you were unsure about becomes a question for Legal, your vendor or
                  Technology, with the cautious assumption used meanwhile. Blocking ones come first.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why this exists */}
      <section className={styles.why}>
        <div className={styles.whyInner}>
          <p className={styles.sectionEyebrow}>——— WHY THIS EXISTS</p>
          <div className={styles.whyContent}>
            <h2 className={styles.whyTitle}>For governance leads, from a one-person team to an enterprise</h2>
            <p className={styles.whyText}>
              The EU AI Act, ISO/IEC 42001 and the NIST AI RMF all start from what a system is for,
              who is responsible for it and the harm it could cause. The Baseline asks exactly that,
              then tells you what applies, why, and what to do first, scaled to the use case rather
              than a one-size checklist.
            </p>
            <p className={styles.whyText}>
              It's free and open source, built by an AI risk practitioner. The rules, the
              legal test scenarios behind them and their sources in the Official Journal are all public.
              It's a starting point, not legal advice: the goal is to surface the right questions
              for the right people before decisions get made.
            </p>
            <div className={styles.whyLinks}>
              <Link to="/about" className={styles.btnSecondary}>How the classification works →</Link>
              <a
                href="https://github.com/b-gowland/ai-risk-baseline"
                className={styles.btnSecondary}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on GitHub ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.bottomCta}>
        <div className={styles.bottomCtaInner}>
          <h2 className={styles.bottomCtaTitle}>Ready to assess a use case?</h2>
          <p className={styles.bottomCtaSub}>About 10 minutes. Free. No signup. Share the link with your team.</p>
          <Link to="/configure" className={styles.btnPrimary}>
            Assess a use case →
          </Link>
        </div>
      </section>
    </div>
  )
}
