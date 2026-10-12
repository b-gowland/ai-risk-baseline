/**
 * date-aware.js — date state annotation for regulatory items
 *
 * States:
 *   "in_force"        — effective_from is in the past
 *   "upcoming"        — effective_from is in the future (within 12 months = urgent)
 *   "upcoming_distant" — effective_from is in the future (beyond 12 months)
 *
 * Key dates (EU AI Act as amended by the Digital Omnibus, Reg. (EU) 2026/1744):
 *   2 February 2025 — Article 4 AI literacy, Article 5 prohibitions
 *   2 August 2026   — Article 50 transparency
 *   2 December 2027 — Annex III high-risk obligations
 *   2 August 2028   — Annex I (product-embedded) high-risk obligations
 * Dates live in regulatory-mappings.json; scripts/check-date-crossings.js flags
 * any that pass after an item was last verified.
 */

/**
 * Annotate a regulatory mapping item with its current date state.
 * @param {Object} item - regulatory mapping item with effective_from (ISO string)
 * @param {Date} today - current date (injectable for testing)
 * @returns {Object} item with added date_state, days_until, is_urgent fields
 */
export function annotateWithDateState(item, today = new Date()) {
  if (!item.effective_from) {
    return { ...item, date_state: 'in_force', days_until: null, is_urgent: false };
  }

  const effectiveDate = new Date(item.effective_from);
  const diffMs = effectiveDate - today;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return {
      ...item,
      date_state: 'in_force',
      days_until: null,
      is_urgent: false,
      effective_label: 'In force',
    };
  }

  const isUrgent = diffDays <= 365; // within 12 months

  return {
    ...item,
    date_state: isUrgent ? 'upcoming' : 'upcoming_distant',
    days_until: diffDays,
    is_urgent: isUrgent,
    effective_label: `From ${formatDate(effectiveDate)}`,
  };
}

/**
 * Format a date as "D Month YYYY" (e.g. "2 August 2026")
 */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a relative deadline for display.
 * Returns e.g. "3 months away" or "Already in force"
 */
export function formatDeadlineLabel(item) {
  if (item.date_state === 'in_force') return 'In force';
  if (!item.days_until) return '';
  const months = Math.ceil(item.days_until / 30);
  if (months <= 1) return 'This month';
  if (months < 12) return `${months} months away`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (remMonths === 0) return `${years} year${years > 1 ? 's' : ''} away`;
  return `${years}y ${remMonths}mo away`;
}
