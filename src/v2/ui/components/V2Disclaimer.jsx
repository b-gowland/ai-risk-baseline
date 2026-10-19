import { Link } from 'react-router-dom'
import styles from './V2Disclaimer.module.css'

export default function V2Disclaimer() {
  return (
    <div className={styles.banner} role="note" aria-label="Disclaimer">
      <span className={styles.label}>Starting point, not legal advice.</span>{' '}
      This tool produces a governance baseline, not a compliance determination. Verify every citation against
      the primary sources and consult qualified advisors for your situation.{' '}
      <Link to="/disclaimer" className={styles.more}>Read more</Link>
    </div>
  )
}
