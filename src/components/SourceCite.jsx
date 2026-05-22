/**
 * SourceCite.jsx
 * Inline provenance icon. Renders a (?) button that opens a popover showing:
 * - Source note text
 * - Last verified date
 * - Report inaccuracy link to a pre-filled GitHub issue
 *
 * FR-96: Every regulatory, control, and risk item surfaces _source_note
 * and last_verified on activation.
 *
 * Accessibility:
 * - Button element, not div
 * - aria-label = "Source for: [first 50 chars of claim]"
 * - Popover role="tooltip" + aria-live="polite"
 * - Esc closes; click outside closes; focus returns to button on close
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { trackEvent, events } from '../utils/analytics.js'
import styles from './SourceCite.module.css'

function formatVerifiedDate(isoDate) {
  if (!isoDate) return null
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return isoDate
  }
}

function buildIssueUrl(itemId, claimText, sourceNote) {
  const title = encodeURIComponent(`Inaccuracy: ${itemId || 'unknown'}`)
  const body = encodeURIComponent(
    `Item: ${itemId || 'unknown'}\nClaim: ${(claimText || '').slice(0, 200)}\nSource note: ${sourceNote || ''}\nReason it is wrong:\n\n`
  )
  return `https://github.com/b-gowland/ai-risk-baseline/issues/new?title=${title}&body=${body}`
}

export default function SourceCite({ sourceNote, lastVerified, claimText, itemId, onOpen }) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)

  // Don't render if there's nothing to show
  if (!sourceNote && !lastVerified) return null

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev
      if (next && onOpen) onOpen()
      return next
    })
  }, [onOpen])

  const close = useCallback(() => {
    setOpen(false)
    buttonRef.current?.focus()
  }, [])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, close])

  const verifiedLabel = formatVerifiedDate(lastVerified)
  const issueUrl = buildIssueUrl(itemId, claimText, sourceNote)
  const ariaLabel = `Source for: ${(claimText || sourceNote || '').slice(0, 50)}`

  return (
    <span className={styles.wrapper}>
      <button
        ref={buttonRef}
        className={styles.citeBtn}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={toggle}
        type="button"
      >
        ?
      </button>

      {open && (
        <span
          ref={popoverRef}
          role="tooltip"
          aria-live="polite"
          className={styles.popover}
        >
          {sourceNote && (
            <span className={styles.sourceText}>{sourceNote}</span>
          )}
          {verifiedLabel && (
            <span className={styles.verifiedLine}>
              Verified {verifiedLabel}
            </span>
          )}
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.reportLink}
            onClick={() => {
              trackEvent(events.INACCURACY_REPORT_CLICKED, { item_type: 'unknown', item_id: itemId || 'unknown' })
              close()
            }}
          >
            Report an inaccuracy ↗
          </a>
        </span>
      )}
    </span>
  )
}
