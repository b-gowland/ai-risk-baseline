/**
 * Plausible Analytics wrapper
 * Matches the ai-risk-training pattern — no-op when Plausible not loaded.
 */

export function trackEvent(name, props) {
  if (typeof window !== `undefined` && window.plausible) {
    window.plausible(name, { props })
  }
}

export const events = {
  BASELINE_STARTED:   `baseline_started`,
  BASELINE_COMPLETED: `baseline_completed`,
  EXAMPLE_VIEWED:     `example_viewed`,
  URL_COPIED:         `url_copied`,
  MARKDOWN_COPIED:    `markdown_copied`,
  PDF_PRINTED:        `pdf_printed`,
  TAB_VIEWED:         `tab_viewed`,
}
