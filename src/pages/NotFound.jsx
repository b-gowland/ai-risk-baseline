/**
 * NotFound.jsx
 * Shown when the app is asked for a path it has no route for, for example
 * after following a mistyped in-app link. A mistyped address typed into the
 * browser never gets here: Cloudflare serves public/404.html with status 404.
 */

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './About.module.css'

export default function NotFound() {
  useEffect(() => {
    // Keep this page out of search results while it is showing.
    const meta = document.createElement(`meta`)
    meta.name = `robots`
    meta.content = `noindex`
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>— PAGE NOT FOUND</p>
        <h1 className={styles.title}>That page isn't here</h1>
        <p className={styles.text}>
          The address may be mistyped, or the page may have moved.
        </p>
        <ul className={styles.list}>
          <li><Link to={`/`} className={styles.link}>Baseline home</Link></li>
          <li><Link to={`/configure`} className={styles.link}>Assess a use case</Link></li>
          <li><Link to={`/examples`} className={styles.link}>Worked examples</Link></li>
        </ul>
      </div>
    </div>
  )
}
