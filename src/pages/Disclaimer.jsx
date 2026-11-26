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
            The classification rules, requirements and framework crosswalks in this tool are
            maintained on a best-effort basis by an individual practitioner. They may be
            incomplete, out of date, or incorrect for your specific circumstances.
          </p>
          <p className={styles.text}>
            Regulatory frameworks evolve continuously. Article numbers, obligations, and
            application dates may change after the rules were last verified. Always verify
            requirements against the current primary source before acting on them.
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
            is "compliant" with any law, regulation, or standard. The EU AI Act classification
            is an indicative reading of your answers, not a legal determination, and the output
            describes applicable requirements without determining whether they are met.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Coverage limitations</h2>
          <p className={styles.text}>
            The tool covers the EU AI Act, ISO/IEC 42001, 23894 and 42005, and the NIST AI RMF
            and Generative AI Profile, with country packs for GDPR, UK data protection law and
            Australia's Privacy Act and national AI guidance. Packs cover the main data protection
            requirements for AI, not every provision. Other countries' laws, and consumer, employment,
            product, equality and sector rules, are not covered.
            Requirements specific to your sector, entity type, or regulatory status may not be reflected.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacy and analytics</h2>
          <p className={styles.text}>
            Your answers are encoded into the URL and processed entirely
            in your browser. No configuration data is sent to any server. Anyone you
            share the URL with can see the answers it contains.
          </p>
          <p className={styles.text}>
            Baseline uses{` `}
            <a
              href="https://plausible.io/data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Plausible Analytics ↗
            </a>
            , which sets no cookies and stores no IP address or persistent visitor
            identifier. It records the page path (not your answers in the URL), referrer,
            country, and browser and device type. We publish only aggregates and never sell
            or share data.
          </p>
          <p className={styles.text}>
            The Plausible site is shared with the other two free AI Risk Practice sites, the
            practice scenarios (app.airiskpractice.org) and the reference library
            (library.airiskpractice.org), so their visits are counted together. Besides page
            views, Baseline sends exactly three events:
          </p>
          <ul className={styles.list}>
            <li><code>examples_gallery_viewed</code>: the worked examples page was opened.</li>
            <li><code>example_viewed</code>: a worked example was opened, with its <code>example_id</code> (such as G09).</li>
            <li><code>changelog_viewed</code>: the changelog was opened.</li>
          </ul>
          <p className={styles.text}>
            No event carries your answers or anything you type. Fonts are served from this
            site, so no request goes to Google or any other third party apart from Plausible.
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
            {` `}Content (classification rules, requirements, crosswalks and test scenarios) is licensed
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
