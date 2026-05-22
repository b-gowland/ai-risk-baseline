/**
 * Plausible Analytics wrapper
 * Matches the ai-risk-training pattern — no-op when Plausible not loaded.
 *
 * Events updated for Trust & Freshness Layer (May 22, 2026):
 * - source_cite_opened: (?) provenance icon activated — props: item_type (regulatory/control/risk)
 * - inaccuracy_report_clicked: "Report an inaccuracy" link clicked — props: item_type, item_id
 * - changelog_viewed: /changelog page loaded
 * - freshness_pill_clicked: freshness pill in config summary clicked
 *
 * Pattern B IA events (May 2026):
 * - drill_opened: replaces tab_viewed as primary navigation event
 * - drill_focus_set: when a specific focus= param is set within a drill
 * - drill_export_with_rail: Print/PDF triggered with "Include open drill" checked
 * - tab_viewed: retained for legacy ?tab= rewrite compatibility only
 */

export function trackEvent(name, props) {
  if (typeof window !== `undefined` && window.plausible) {
    window.plausible(name, { props })
  }
}

export const events = {
  BASELINE_STARTED:    `baseline_started`,
  BASELINE_COMPLETED:  `baseline_completed`,
  EXAMPLE_VIEWED:      `example_viewed`,
  URL_COPIED:          `url_copied`,
  MARKDOWN_COPIED:     `markdown_copied`,
  PDF_PRINTED:         `pdf_printed`,
  TAB_VIEWED:          `tab_viewed`,           // legacy — used only during ?tab= rewrite
  MAP_CONTROL_CLICKED: `map_control_clicked`,
  MAP_EXPORT:          `map_export`,
  DRILL_OPENED:        `drill_opened`,          // Pattern B primary nav event
  DRILL_FOCUS_SET:     `drill_focus_set`,       // drill + focus= deep-link
  DRILL_EXPORT_RAIL:   `drill_export_with_rail`, // print with rail included
  // Trust & Freshness Layer (FR-101)
  SOURCE_CITE_OPENED:        `source_cite_opened`,       // props: item_type
  INACCURACY_REPORT_CLICKED: `inaccuracy_report_clicked`, // props: item_type, item_id
  CHANGELOG_VIEWED:          `changelog_viewed`,
  FRESHNESS_PILL_CLICKED:    `freshness_pill_clicked`,
  // Worked examples gallery
  EXAMPLES_GALLERY_VIEWED:   `examples_gallery_viewed`,
  EXAMPLE_VIEWED:            `example_viewed`,            // props: example_id
}
