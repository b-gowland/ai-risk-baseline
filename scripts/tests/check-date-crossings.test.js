import test from 'node:test';
import assert from 'node:assert/strict';
import { findCrossings, renderReport } from '../check-date-crossings.js';

const today = new Date('2026-10-13T12:00:00Z');
const mapping = (id, effective_from, last_verified) => ({ id, framework: 'f', effective_from, last_verified });

test('flags a date that passed after the item was last verified', () => {
  const found = findCrossings({ mappings: [mapping('crossed', '2026-08-02', '2026-05-22')] }, today);
  assert.deepEqual(found.map(c => c.id), ['crossed']);
});

test('ignores dates already in force when verified, and future dates', () => {
  const found = findCrossings({ mappings: [
    mapping('already', '2025-02-02', '2026-05-22'),
    mapping('future', '2027-12-02', '2026-10-13'),
    mapping('reverified', '2026-08-02', '2026-10-13'),
  ] }, today);
  assert.deepEqual(found, []);
});

test('a date falling today counts as crossed', () => {
  const found = findCrossings({ mappings: [mapping('today', '2026-10-13', '2026-01-01')] }, today);
  assert.equal(found.length, 1);
});

test('report lists crossings and explains the fix', () => {
  const report = renderReport([{ ...mapping('x', '2026-08-02', '2026-05-22'), source_url: 'https://example.org' }]);
  assert.match(report, /\| x \| f \| 2026-08-02 \| 2026-05-22 \|/);
  assert.match(report, /effective_from/);
  assert.match(renderReport([]), /No regulatory effective dates/);
});
