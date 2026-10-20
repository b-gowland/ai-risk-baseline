import fs from 'node:fs/promises';

// Adapts the v2 data files to the shapes the maintenance checks read:
// dated items for check-date-crossings.js and sourced entries for check-source-urls.js.

export const OBLIGATIONS_FILE = 'src/v2/data/eu-obligations.json';
export const REQUIREMENTS_FILE = 'src/v2/data/requirements.json';
export const PACK_FILES = ['src/v2/packs/gdpr.json', 'src/v2/packs/uk.json', 'src/v2/packs/au.json'];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function loadV2(obligationsFile = OBLIGATIONS_FILE, requirementsFile = REQUIREMENTS_FILE, packFiles = PACK_FILES) {
  const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
  return {
    obligations: await read(obligationsFile),
    requirements: await read(requirementsFile),
    packs: await Promise.all(packFiles.map(read)),
  };
}

// Core library and country packs as one list of { frameworks, requirements } sets.
const sets = ({ requirements, packs = [] }) => [requirements, ...packs];

// EU obligation dates are a date, a key into `dates` (e.g. "annex_iii"), or "basis", which
// depends on the high-risk route, so it expands to one item per route.
function obligationDates(effectiveFrom, dates) {
  if (ISO_DATE.test(effectiveFrom || '')) return [[null, effectiveFrom]];
  if (effectiveFrom === 'basis') return Object.entries(dates);
  if (dates[effectiveFrom]) return [[effectiveFrom, dates[effectiveFrom]]];
  return [];
}

export function datedItems({ obligations, requirements, packs = [] }) {
  const eu = requirements.frameworks?.eu_ai_act || {};
  const items = [];
  for (const o of obligations.obligations) {
    for (const [route, date] of obligationDates(o.effective_from, obligations.dates || {})) {
      items.push({
        id: route ? `${o.id} (${route})` : o.id,
        framework: 'eu_ai_act',
        effective_from: date,
        last_verified: o.last_verified || eu.last_verified,
        source_url: eu.url,
      });
    }
  }
  for (const set of sets({ requirements, packs })) {
    const frameworks = set.frameworks || {};
    for (const r of set.requirements) {
      if (!ISO_DATE.test(r.effective_from || '')) continue;
      const fw = r.sources?.[0]?.framework;
      items.push({
        id: r.id,
        framework: fw,
        effective_from: r.effective_from,
        last_verified: r.last_verified || frameworks[fw]?.last_verified,
        source_url: r.sources?.[0]?.url || frameworks[fw]?.url,
      });
    }
  }
  return { mappings: items };
}

export function sourcedEntries({ requirements, packs = [] }) {
  const all = sets({ requirements, packs });
  const frameworks = all.flatMap(set => Object.entries(set.frameworks || {})).flatMap(([id, fw]) => [
    { id, source_url: fw.url },
    // The public crosswalks that paywalled standards were verified against.
    ...(fw.verified_against || []).map(url => ({ id: `${id} (verification source)`, source_url: url })),
  ]);
  const mappings = all.flatMap(set => set.requirements).flatMap(r =>
    (r.sources || []).filter(s => s.url).map(s => ({ id: r.id, source_url: s.url })));
  return { frameworks, mappings };
}
