import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.wordmark}>AI Risk <em>Practice</em></span>
          <span className={styles.sep}>·</span>
          <span className={styles.copy}>© {year} Ben Gowland</span>
          <span className={styles.sep}>·</span>
          <a
            href="https://github.com/b-gowland/ai-risk-baseline"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Apache 2.0 + CC BY 4.0
          </a>
        </div>

        <nav className={styles.links} aria-label="Footer navigation">
          <Link to="/changelog" className={styles.link}>Changelog</Link>
          <Link to="/disclaimer" className={styles.link}>Disclaimer</Link>
          <Link to="/about" className={styles.link}>About</Link>
          <a
            href="https://github.com/b-gowland/ai-risk-baseline"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          <a
            href="https://library.airiskpractice.org"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Knowledge base ↗
          </a>
          <a
            href="https://app.airiskpractice.org"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Training scenarios ↗
          </a>
        </nav>
      </div>
    </footer>
  )
}
