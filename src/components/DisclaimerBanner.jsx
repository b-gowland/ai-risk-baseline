import { Link, useLocation } from 'react-router-dom'
import styles from './DisclaimerBanner.module.css'

// Only show on output and configure pages (not on disclaimer page itself)
const SHOW_ON = ['/output', '/configure', '/example']

export default function DisclaimerBanner() {
  const { pathname } = useLocation()
  const show = SHOW_ON.some(p => pathname.startsWith(p))
  if (!show) return null

  return (
    <div className={styles.banner} role="note" aria-label="Disclaimer">
      <span className={styles.label}>Starting point — not legal advice.</span>
      {' '}
      <span className={styles.text}>
        This tool produces a governance baseline, not a compliance determination.
        Verify all citations against primary sources and consult qualified advisors for your situation.
      </span>
      {' '}
      <Link to="/disclaimer" className={styles.readmore}>Read more →</Link>
      <span className={styles.notice}>
        <span className={styles.label}>EU AI Act classification is being rebuilt.</span>
        {' '}
        <span className={styles.text}>
          This version has known errors in deciding whether a system is prohibited or high-risk. Don't rely on it for that decision.
        </span>
        {' '}
        <Link to="/changelog" className={styles.readmore}>Details →</Link>
      </span>
    </div>
  )
}
