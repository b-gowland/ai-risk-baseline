import { Link } from 'react-router-dom'
import styles from './About.module.css'

export default function About() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>— ABOUT THE BASELINE</p>
        <h1 className={styles.title}>How this tool works</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What it is</h2>
          <p className={styles.text}>
            The AI Governance Baseline is a free, browser-based inception tool for
            cross-functional AI project teams. It takes five configuration questions
            describing your AI system and returns a tailored output: regulatory obligations,
            risk profile, controls by function, and prioritised actions — ready to share
            with Legal, Cyber, Risk, and the project team before the first sprint starts.
          </p>
          <p className={styles.text}>
            It's designed for the moment a team is deciding whether and how to build or
            deploy an AI system — not for after-the-fact audits or board reporting.
            The goal is to surface the right questions for the right functions at the
            right time, not to replace formal risk assessments or legal advisors.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How the mappings are made</h2>
          <p className={styles.text}>
            Every regulatory mapping is authored by hand against primary sources — the
            EU AI Act official text, GDPR, the NIST AI RMF, ISO/IEC 42001, the OWASP LLM
            Top 10, the Australian Privacy Act, APRA CPS 230, and others. No mapping is
            generated automatically.
          </p>
          <p className={styles.text}>
            Each mapping includes:
          </p>
          <ul className={styles.list}>
            <li>The precise article, section, or control number</li>
            <li>A plain-English description of the requirement</li>
            <li>Whether it's mandatory, recommended, or voluntary</li>
            <li>Applicability predicates (which configurations trigger this mapping)</li>
            <li>A source note referencing the exact document and section</li>
            <li>A link to the primary source document</li>
          </ul>
          <p className={styles.text}>
            Every mapping is auditable in the{` `}
            <a
              href="https://github.com/b-gowland/ai-risk-baseline/blob/main/src/data/regulatory-mappings.json"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              regulatory-mappings.json ↗
            </a>
            {` `}file in the public repository.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitations</h2>
          <ul className={styles.list}>
            <li>
              <strong>Not legal advice.</strong> Every output should be reviewed by qualified
              legal counsel before use in a formal governance document.
            </li>
            <li>
              <strong>Not exhaustive.</strong> Phase 1 covers ten frameworks and a specific
              set of high-probability system configurations. Edge cases and less common
              configurations may produce thinner output.
            </li>
            <li>
              <strong>Regulatory landscape changes.</strong> Laws are amended, guidance is
              updated, and enforcement priorities shift. The mappings are maintained on a
              best-effort basis — check source URLs for current status.
            </li>
            <li>
              <strong>No platform-native controls yet.</strong> Platform-specific guidance
              for AWS, Azure, Google Cloud, and others is planned for Phase 2.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How to contribute</h2>
          <p className={styles.text}>
            The Baseline is open source under Apache 2.0 (code) and CC BY 4.0 (content).
            Contributions are welcome — especially new regulatory mappings, additional
            jurisdiction coverage, and corrections to existing mappings.
          </p>
          <p className={styles.text}>
            The most valuable contributions are:
          </p>
          <ul className={styles.list}>
            <li>New jurisdiction coverage (US, UK, Singapore, Japan, Canada)</li>
            <li>Corrections to existing mappings with source citations</li>
            <li>New framework additions (sector-specific regulations, industry standards)</li>
            <li>Platform-native control mappings (AWS, Azure, GCP, etc.)</li>
          </ul>
          <p className={styles.text}>
            Please read{` `}
            <a
              href="https://github.com/b-gowland/ai-risk-baseline/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              CONTRIBUTING.md ↗
            </a>
            {` `}before submitting — it describes the predicate language used in the data files
            and the source citation requirements for new mappings.
          </p>
          <a
            href="https://github.com/b-gowland/ai-risk-baseline"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnPrimary}
          >
            View on GitHub ↗
          </a>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>The AI Risk Practice suite</h2>
          <p className={styles.text}>
            The Baseline is one of three free, open-source tools in the AI Risk Practice suite:
          </p>
          <div className={styles.suiteLinks}>
            <a
              href="https://b-gowland.github.io/ai-risk-kb/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.suiteItem}
            >
              <span className={styles.suiteName}>Knowledge Base ↗</span>
              <span className={styles.suiteDesc}>32 AI risk entries with four depth layers, mapped to frameworks</span>
            </a>
            <a
              href="https://b-gowland.github.io/ai-risk-training/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.suiteItem}
            >
              <span className={styles.suiteName}>Training Scenarios ↗</span>
              <span className={styles.suiteDesc}>32 branching scenarios across 4 personas, ~6 hours of content</span>
            </a>
          </div>
        </section>

        <div className={styles.disclaimerCta}>
          <p className={styles.text}>
            For the full disclaimer and limitations statement, see the{` `}
            <Link to={`/disclaimer`} className={styles.link}>Disclaimer page →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
