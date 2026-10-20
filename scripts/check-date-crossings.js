import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadV2, datedItems } from './v2-sources.js';

// A mapping's effective_from date "crosses" when it falls after the item was
// last verified but on or before today. The site then shows the item as
// "In force" on the strength of a review done before that date arrived, and
// regulators frequently move dates late (e.g. the EU AI Act Digital Omnibus
// deferring high-risk obligations days before 2 August 2026).
export function findCrossings(data, today = new Date()) {
  const day = d => new Date(`${d}T00:00:00Z`).getTime();
  const now = day(today.toISOString().slice(0, 10));
  return (data.mappings || [])
    .filter(m => m.effective_from && m.last_verified
      && day(m.effective_from) > day(m.last_verified) && day(m.effective_from) <= now)
    .map(m => ({ id: m.id, framework: m.framework, effective_from: m.effective_from,
      last_verified: m.last_verified, source_url: m.source_url }));
}

const cell = value => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
export function renderReport(crossings) {
  const lines = ['# Regulatory date crossings', ''];
  if (!crossings.length) {
    lines.push('No regulatory effective dates have passed since their mapping was last verified.');
    return lines.join('\n') + '\n';
  }
  lines.push(`${crossings.length} mapping(s) reached their effective date after they were last verified. `
    + 'The site now shows these as in force. Confirm against the primary source that the date did not move, '
    + 'then update `effective_from` (and `last_verified`) in `src/v2/data/eu-obligations.json` or '
    + '`src/v2/data/requirements.json`, and the verification register in `docs/v2/classification-spec.md` §8.', '',
  '| Mapping | Framework | Effective from | Last verified | Source |', '|---|---|---|---|---|');
  for (const c of crossings) lines.push(`| ${cell(c.id)} | ${cell(c.framework)} | ${c.effective_from} | `
    + `${c.last_verified} | ${cell(c.source_url)} |`);
  return lines.join('\n') + '\n';
}

export async function run(output = 'reports/date-crossings.md') {
  const crossings = findCrossings(datedItems(await loadV2()));
  const report = renderReport(crossings);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, report);
  console.log(report);
  return crossings.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`Date crossing check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
