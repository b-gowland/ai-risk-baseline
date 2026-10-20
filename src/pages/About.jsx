import { Link } from 'react-router-dom'
import styles from './About.module.css'

const REPO = `https://github.com/b-gowland/ai-risk-baseline/blob/main`

export default function About() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>— ABOUT THE BASELINE</p>
        <h1 className={styles.title}>How this tool works</h1>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What it is</h2>
          <p className={styles.text}>
            The AI Governance Baseline is a free, browser-based tool for AI governance leads,
            from a one-person function to an enterprise AI risk team. Describe one AI use case in
            plain-language questions and get a starting baseline: its EU AI Act classification and
            your role, a governance tier, the requirements that apply (crosswalked to ISO/IEC and
            NIST), your first five actions, and the open questions to escalate.
          </p>
          <p className={styles.text}>
            It is for the moment a use case lands on your desk, before decisions are made.
            It surfaces what applies and why; it does not replace a formal risk assessment
            or legal advice.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How the classification works</h2>
          <p className={styles.text}>
            The EU AI Act, ISO/IEC 42001 and 23894, and the NIST AI RMF all start from a system's
            intended purpose, who is responsible for it and the harm it could cause, not from the
            technology it uses. So the Baseline asks about purpose first and works through the Act
            in order:
          </p>
          <ul className={styles.list}>
            <li>Scope (Art. 2), including the exclusions</li>
            <li>Prohibited practices (Art. 5)</li>
            <li>High-risk via regulated products (Art. 6(1), Annex I)</li>
            <li>High-risk via listed uses (Art. 6(2), Annex III), and the Art. 6(3) exemption</li>
            <li>Transparency obligations (Art. 50)</li>
            <li>Your role: provider, deployer, importer or distributor, and when Art. 25 makes you the provider</li>
          </ul>
          <p className={styles.text}>
            Every result shows the answers and articles behind it. Anything you are unsure about
            becomes an open question with a stated, cautious assumption, never a silent gap.
            Technology choices (LLM, agents, biometrics) shape the requirements but never
            the legal classification.
          </p>
          <p className={styles.text}>
            Separately, a <strong>governance tier</strong> from 1 to 4 comes from a published
            matrix of worst plausible harm and autonomy, raised for vulnerable people and sensitive
            data, with EU high-risk as a floor. It applies whether or not the EU AI Act does.
          </p>
          <p className={styles.text}>
            The rules are written down in the{` `}
            <a href={`${REPO}/docs/v2/classification-spec.md`} target="_blank" rel="noopener noreferrer" className={styles.link}>
              classification spec ↗
            </a>
            {` `}and tested against a suite of{` `}
            <a href={`${REPO}/src/v2/golden/scenarios.json`} target="_blank" rel="noopener noreferrer" className={styles.link}>
              golden scenarios ↗
            </a>
            , each citing the provision it relies on: carve-outs such as fraud detection, exceptions
            such as emotion recognition for safety reasons, and role shifts under Art. 25.
          </p>
        </section>

        <section className={styles.section} id="methodology">
          <h2 className={styles.sectionTitle}>Sources and currency</h2>
          <p className={styles.text}>
            The EU AI Act rules were checked on 20 October 2026 against the Official Journal text
            of Regulation (EU) 2024/1689 and the amending Regulation (EU) 2026/1744 (Digital
            Omnibus on AI), as recorded in the spec's verification register. NIST AI RMF 1.0
            subcategory ids and the NIST AI 600-1 risk names were checked against the NIST
            publications.
          </p>
          <p className={styles.text}>
            ISO/IEC standards are paywalled. The Baseline cites their clause and control numbers
            and titles, with its own plain-language paraphrase, and never reproduces their text.
            Every ISO/IEC 42001, 23894 and 42005 reference was verified against NIST's official
            crosswalks from the AI RMF to those standards, published on the NIST AI Resource Center.
            The 42001 Annex A controls were also cross-checked against an independent listing of
            the published edition. ISO/IEC 42005 is cited only by top-level clause, because NIST's
            crosswalk was made against its draft.
          </p>
          <p className={styles.text}>
            The country packs were checked against primary legislation on the same day: the GDPR on
            EUR-Lex; the Data (Use and Access) Act 2025 and its commencement regulations on
            legislation.gov.uk; and the Privacy and Other Legislation Amendment Act 2024 on the Federal
            Register of Legislation, together with guidance from the ICO, the OAIC and the National AI Centre.
          </p>
          <p className={styles.text}>
            Source URLs are checked automatically each month, and a scheduled check flags any
            obligation whose date passes after it was last verified. <strong>The content has not
            been independently audited.</strong> Verify against the cited primary source before using
            it in a formal governance document. Found something wrong?{` `}
            <a
              href="https://github.com/b-gowland/ai-risk-baseline/issues/new?title=Content+inaccuracy&body=Describe+the+issue+and+cite+the+correct+source:"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              Report it on GitHub ↗
            </a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitations</h2>
          <ul className={styles.list}>
            <li>
              <strong>Not legal advice.</strong> Every output should be reviewed by qualified
              advisors before use in a formal governance document.
            </li>
            <li>
              <strong>Coverage.</strong> The core is the EU AI Act, ISO/IEC 42001, 23894 and 42005,
              and the NIST AI RMF and Generative AI Profile. Country packs add GDPR (automatically,
              with an EU connection and personal data), UK data protection law as amended in 2026,
              and Australia's Privacy Act and national AI guidance. Other countries, and consumer,
              employment, product and sector rules, are not covered.
            </li>
            <li>
              <strong>Deliberate simplifications.</strong> There is no question yet on systems already
              on the market before the application dates, on Annex I Section B products, or on the
              GPAI systemic-risk threshold; these appear as notes or open questions.
            </li>
            <li>
              <strong>The law moves.</strong> Rules are maintained on a best-effort basis, and the
              changelog records every change.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How to contribute</h2>
          <p className={styles.text}>
            The Baseline is open source under Apache 2.0 (code) and CC BY 4.0 (content).
            The most valuable contributions are:
          </p>
          <ul className={styles.list}>
            <li>Corrections to the classification rules, citing the primary text</li>
            <li>New edge-case test scenarios, each citing the provision it relies on</li>
            <li>Corrections to the ISO/IEC and NIST crosswalk</li>
            <li>New country packs, or corrections to the GDPR, UK and Australia packs</li>
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
            {` `}before submitting.
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
              href="https://library.airiskpractice.org/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.suiteItem}
            >
              <span className={styles.suiteName}>Knowledge Base ↗</span>
              <span className={styles.suiteDesc}>32 AI risk entries with four depth layers, mapped to frameworks</span>
            </a>
            <a
              href="https://app.airiskpractice.org/"
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
