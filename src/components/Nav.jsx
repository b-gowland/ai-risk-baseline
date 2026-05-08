import { Link, NavLink } from 'react-router-dom'
import styles from './Nav.module.css'

export default function Nav() {
  return (
    <header className={styles.nav} role="banner">
      <div className={styles.inner}>
        {/* Wordmark */}
        <Link to="/" className={styles.wordmark} aria-label="AI Governance Baseline — home">
          AI Risk <em>Practice</em>
          <span className={styles.product}>Baseline</span>
        </Link>

        {/* Navigation links */}
        <nav className={styles.links} aria-label="Main navigation">
          <NavLink
            to="/configure"
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
          >
            Profile your system
          </NavLink>
          <NavLink
            to="/example"
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
          >
            See an example
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
          >
            About
          </NavLink>

          {/* Cross-tool links */}
          <a
            href="https://library.airiskpractice.org"
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Knowledge base ↗
          </a>
        </nav>

        {/* CTA */}
        <Link to="/configure" className={styles.cta}>
          Start →
        </Link>
      </div>
    </header>
  )
}
