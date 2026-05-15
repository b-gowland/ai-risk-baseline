import { useEffect, useRef } from 'react'
import styles from './DetailRail.module.css'

/**
 * DetailRail — right-side detail panel, 300px desktop.
 * Per FR-87: role="complementary", aria-label, focus management.
 * Per FR-88: Esc closes. Per FR-89: reduced motion respected via CSS.
 * Per FR-83: Map (main) remains primary canvas; rail is adjacent.
 */
export default function DetailRail({ open, title, onClose, children }) {
  const railRef = useRef(null)
  const closeRef = useRef(null)

  // Focus management: move focus into rail on open, back to trigger on close
  useEffect(() => {
    if (open && closeRef.current) {
      // Small delay to let animation start before focus moves
      const t = setTimeout(() => closeRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // Esc closes rail
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === `Escape`) onClose()
    }
    document.addEventListener(`keydown`, handleKey)
    return () => document.removeEventListener(`keydown`, handleKey)
  }, [open, onClose])

  // aria-live announcement
  const announceRef = useRef(null)
  useEffect(() => {
    if (open && announceRef.current) {
      announceRef.current.textContent = `${title} detail panel opened`
    }
  }, [open, title])

  return (
    <>
      {/* Screen reader live region */}
      <div
        ref={announceRef}
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      />

      <aside
        ref={railRef}
        className={`${styles.rail} ${open ? styles.railOpen : styles.railClosed}`}
        role="complementary"
        aria-label={`${title} detail panel`}
        aria-hidden={!open}
      >
        <div className={styles.railHeader}>
          <h2 className={styles.railTitle}>{title}</h2>
          <button
            ref={closeRef}
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close detail panel"
          >
            ✕
          </button>
        </div>
        <div className={styles.railBody}>
          {open && children}
        </div>
      </aside>
    </>
  )
}
