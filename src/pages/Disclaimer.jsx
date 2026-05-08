import { Link } from 'react-router-dom'
import styles from './Disclaimer.module.css'

export default function Disclaimer() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>— DISCLAIMER</p>
        <h1 className={styles.title}>Not legal advice</h1>

        <div className={styles.alert}>
          <p className={styles.alertText}>
            The AI Governance Baseline is an informational tool. Output from this tool
            is a starting point for internal discussion and planning — not legal advice,
            regulatory guidance, or a compliance certification. Do not rely on this output
            as the sole basis for legal, regulatory, or business decisions.
          </p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Accuracy and completeness</h2>
          <p className={styles.text}>
            The regulatory mappings, risk assessments, and control recommendations in this
            tool are maintained on a best-effort basis by an individual practitioner.
            They may be incomplete, out of date, or incorrect for your specific circumstances.
          </p>
          <p className={styles.text}>
            Regulatory frameworks evolve continuously. Article numbers, obligations, and
            enforcement dates may change after these mappings were last updated. Always
            verify requirements against the current primary source before acting on them.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Not a substitute for professional advice</h2>
          <p className={styles.text}>
            AI governance requirements are highly fact-specific. Whether a particular
            regulation applies to your system — and how it applies — depends on technical,
            legal, and commercial factors that this tool cannot fully capture.
          </p>
          <p className={styles.text}>
            You should consult qualified legal counsel, compliance specialists, or
            regulatory advisors before making compliance determinations or governance
            decisions based on this output.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>No "compliance" claim</h2>
          <p className={styles.text}>
            This tool does not assess, certify, or indicate whether your AI system
            is "compliant" with any law, regulation, or standard. Output describes
            applicable requirements and suggested controls — it does not determine
            whether those requirements are met.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Jurisdiction limitations</h2>
          <p className={styles.text}>
            Phase 1 of the Baseline covers EU, Australian, UK, US, Singapore, and Japan
            jurisdictions at varying levels of depth. Coverage is not exhaustive within
            any jurisdiction. Requirements specific to your sector, entity type, or
            regulatory status may not be reflected.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>No data collection</h2>
          <p className={styles.text}>
            Your configuration answers are encoded into the URL and processed entirely
            in your browser. No configuration data is sent to any server. Plausible
            Analytics is used for anonymised, aggregate usage statistics only — no
            personally identifiable information is collected.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Licence</h2>
          <p className={styles.text}>
            Tool code is licensed under{` `}
            <a
              href="https://www.apache.org/licenses/LICENSE-2.0"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Apache 2.0 ↗
            </a>.
            {` `}Content (regulatory mappings, risk descriptions, control text) is licensed
            under{` `}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              CC BY 4.0 ↗
            </a>.
            {` `}Attribution: AI Risk Practice Baseline (Ben Gowland), airiskpractice.org.
          </p>
        </section>

        <div className={styles.nav}>
          <Link to={`/`} className={styles.link}>← Back to Baseline</Link>
          {` · `}
          <Link to={`/about`} className={styles.link}>About this tool →</Link>
        </div>
      </div>
    </div>
  )
}
