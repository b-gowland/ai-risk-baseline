/**
 * Changelog.jsx
 * Content update log for AI Governance Baseline.
 * Reads changelog.json, renders reverse-chronological entries grouped by month.
 * FR-99: /changelog route.
 *
 * Note: This is content changes only — not code commits.
 * Code history lives in the GitHub repo.
 */

import changelogData from '../data/changelog.json'
import siteVersion from '../data/site-version.json'
import { trackEvent, events } from '../utils/analytics.js'
import { useEffect } from 'react'
import styles from './Changelog.module.css'

const TYPE_LABELS = {
  feature: `New`,
  update: `Updated`,
  fix: `Corrected`,
  removed: `Removed`,
}

const TYPE_CLASSES = {
  feature: `typeFeature`,
  update: `typeUpdate`,
  fix: `typeFix`,
  removed: `typeRemoved`,
}

function formatMonth(isoDate) {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long' })
  } catch {
    return isoDate?.slice(0, 7) || 'Unknown'
  }
}

function formatDay(isoDate) {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return isoDate
  }
}

function groupByMonth(entries) {
  const groups = {}
  const order = []
  ;(entries || []).forEach(entry => {
    const month = formatMonth(entry.date)
    if (!groups[month]) {
      groups[month] = []
      order.push(month)
    }
    groups[month].push(entry)
  })
  // Reverse-chronological by first occurrence of each month
  return order.map(month => ({ month, entries: groups[month] }))
}

export default function Changelog() {
  const entries = changelogData?.entries || []
  // Sort entries: newest first
  const sorted = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const groups = groupByMonth(sorted)

  useEffect(() => {
    trackEvent(events.CHANGELOG_VIEWED)
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>— AI GOVERNANCE BASELINE</p>
          <h1 className={styles.title}>Content Changelog</h1>
          <p className={styles.subtitle}>
            Material updates to regulatory mappings, controls, and risk data.
            Code changes are in the{` `}
            <a
              href="https://github.com/b-gowland/ai-risk-baseline/commits/main"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extLink}
            >
              GitHub commit history ↗
            </a>.
          </p>
          <p className={styles.versionNote}>
            Site content version: v{siteVersion.version} · Last verified {siteVersion.verified_month}
          </p>
        </div>

        {groups.length === 0 ? (
          <div className={styles.empty}>
            <p>No content updates recorded yet. Last reviewed: {siteVersion.verified_month}.</p>
          </div>
        ) : (
          <div className={styles.log}>
            {groups.map(group => (
              <div key={group.month} className={styles.monthGroup}>
                <h2 className={styles.monthHeading}>{group.month}</h2>
                <div className={styles.entryList}>
                  {group.entries.map((entry, i) => (
                    <div key={i} className={styles.entry}>
                      <div className={styles.entryMeta}>
                        <span className={`${styles.typeBadge} ${styles[TYPE_CLASSES[entry.type] || 'typeUpdate']}`}>
                          {TYPE_LABELS[entry.type] || entry.type}
                        </span>
                        <span className={styles.entryDate}>{formatDay(entry.date)}</span>
                      </div>
                      <h3 className={styles.entryTitle}>{entry.title}</h3>
                      {entry.detail && (
                        <p className={styles.entryDetail}>{entry.detail}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Found an inaccuracy?{` `}
            <a
              href="https://github.com/b-gowland/ai-risk-baseline/issues/new?title=Content+inaccuracy&body=Describe+the+issue:"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extLink}
            >
              Report it on GitHub ↗
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
