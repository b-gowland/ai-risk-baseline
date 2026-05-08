import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

// Credit decisioning worked example URL (Sarah's case)
const EXAMPLE_URL = `/example`

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>——— AI RISK PRACTICE · BASELINE</p>
          <h1 className={styles.heroTitle}>
            Describe your AI system.<br />
            <em>Get your governance baseline.</em>
          </h1>
          <p className={styles.heroSub}>
            Five questions. Free. No signup. Output is a shareable artefact — risk profile, regulatory
            citations, and controls mapped to your system and jurisdiction.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/configure" className={styles.btnPrimary}>
              Start profiling →
            </Link>
            <Link to={EXAMPLE_URL} className={styles.btnSecondary}>
              See a worked example
            </Link>
          </div>
          <p className={styles.heroMeta}>
            Takes approximately 4 minutes · No data collected · Apache 2.0 open source
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.howInner}>
          <p className={styles.sectionEyebrow}>——— HOW IT WORKS</p>
          <h2 className={styles.sectionTitle}>Three steps to a governance baseline</h2>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <h3 className={styles.stepTitle}>Configure your system</h3>
              <p className={styles.stepText}>
                Answer five questions: system type, how it's used, what data it processes,
                which jurisdictions apply, and which platform it runs on.
                Each question has help text to disambiguate adjacent options.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <h3 className={styles.stepTitle}>Get your output</h3>
              <p className={styles.stepText}>
                The tool produces a tailored five-tab output: regulatory citations with article
                numbers and deadlines, ranked risk profile linked to the knowledge base,
                controls filtered by function, and prioritised actions.
              </p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <h3 className={styles.stepTitle}>Share with your team</h3>
              <p className={styles.stepText}>
                Every configuration encodes into the URL. Share the link with Legal, Cyber,
                or your board. Export as Markdown for Confluence or Notion.
                Download as PDF for your governance file.
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
              <span className={styles.whatIcon}>⚖️</span>
              <div>
                <h3 className={styles.whatTitle}>Regulatory citations</h3>
                <p className={styles.whatText}>
                  Article-level citations for EU AI Act, GDPR, AU Privacy Act, APRA CPS 230,
                  NIST AI RMF, ISO 42001, OWASP LLM Top 10, and more.
                  Every citation links to the primary source.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon}>🎯</span>
              <div>
                <h3 className={styles.whatTitle}>Ranked risk profile</h3>
                <p className={styles.whatText}>
                  Top 7 risks for your configuration, ranked by relevance.
                  Each links to the AI Risk Practice Knowledge Base for detailed analysis.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon}>🔧</span>
              <div>
                <h3 className={styles.whatTitle}>Function-filtered controls</h3>
                <p className={styles.whatText}>
                  Controls for Risk, Legal, Technology, and Procurement — each with owner,
                  effort rating, and framework references. Not a generic checklist.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon}>✅</span>
              <div>
                <h3 className={styles.whatTitle}>Prioritised actions</h3>
                <p className={styles.whatText}>
                  Five next steps with owners and effort estimates — the
                  "what do I do first this sprint?" answer your team is looking for.
                </p>
              </div>
            </div>
            <div className={styles.whatItem}>
              <span className={styles.whatIcon}>🔗</span>
              <div>
                <h3 className={styles.whatTitle}>Shareable URL</h3>
                <p className={styles.whatText}>
                  The full configuration encodes into the URL.
                  One link gives Legal and Cyber a shared, function-filtered starting point.
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
            <h2 className={styles.whyTitle}>Free, open, and practitioner-built</h2>
            <p className={styles.whyText}>
              Most AI governance tools are either expensive enterprise products or generic
              checklists that don't account for your system type, jurisdiction, or function.
              The Baseline is a free, open-source tool built by an AI risk practitioner
              for practitioners — with every mapping auditable in the public repository.
            </p>
            <p className={styles.whyText}>
              It's a starting point, not a compliance certification. Every claim links to a
              primary source. Every output comes with a disclaimer. The goal is to save
              your team two weeks of pre-meeting work — not to replace your advisors.
            </p>
            <div className={styles.whyLinks}>
              <Link to="/about" className={styles.btnSecondary}>How the mappings are made →</Link>
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
          <h2 className={styles.bottomCtaTitle}>Ready to profile your system?</h2>
          <p className={styles.bottomCtaSub}>4 minutes. Free. No signup required.</p>
          <Link to="/configure" className={styles.btnPrimary}>
            Start profiling →
          </Link>
        </div>
      </section>
    </div>
  )
}
