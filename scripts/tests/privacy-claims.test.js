// Privacy claims: the privacy section of /disclaimer must list exactly the
// analytics events the code sends, and the properties they carry, and say the
// Plausible site is shared with the app and the library. Modelled on
// ai-risk-training/src/__tests__/privacy-claims.test.jsx, done statically
// because this repo's tests run under node --test without a DOM.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { events, eventProps } from '../../src/utils/analytics.js';

const root = new URL('../../', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');

function sourceFiles(dir) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = join(dir, name);
    if (statSync(join(root, rel)).isDirectory()) return sourceFiles(rel);
    return /\.(js|jsx)$/.test(name) ? [rel] : [];
  });
}

// Every trackEvent(...) call outside the wrapper: the event and its prop keys.
const calls = sourceFiles('src')
  .filter((f) => !f.endsWith('utils/analytics.js'))
  .flatMap((f) => [...read(f).matchAll(/trackEvent\(\s*([^,)]+)\s*(?:,\s*\{([^}]*)\})?\s*\)/g)]
    .map((m) => ({ file: f, arg: m[1].trim(), props: m[2] })));

const byConstant = Object.fromEntries(Object.entries(events).map(([k, v]) => [`events.${k}`, v]));

test('every trackEvent call names an event from the events list', () => {
  assert.ok(calls.length > 0, 'no trackEvent calls found');
  for (const c of calls) {
    assert.ok(c.arg in byConstant, `${c.file}: trackEvent(${c.arg}) does not use the events list`);
  }
});

test('every listed event is sent somewhere, and no other', () => {
  const sent = new Set(calls.map((c) => byConstant[c.arg]));
  assert.deepEqual([...sent].sort(), Object.values(events).sort());
});

test('events carry only the listed properties', () => {
  for (const c of calls) {
    const keys = c.props ? [...c.props.matchAll(/(\w+)\s*:/g)].map((m) => m[1]) : [];
    assert.deepEqual(keys.sort(), [...eventProps[byConstant[c.arg]]].sort(),
      `${c.file}: ${c.arg} sends properties not listed in eventProps`);
  }
});

test('the privacy section lists exactly the events and properties sent', () => {
  const page = read('src/pages/Disclaimer.jsx');
  const section = page.slice(page.indexOf('Privacy and analytics'), page.indexOf('>Licence<'));
  const listed = new Set([...section.matchAll(/<code>(\w+)<\/code>/g)].map((m) => m[1]));
  const expected = new Set([...Object.values(events), ...Object.values(eventProps).flat()]);
  assert.deepEqual([...listed].sort(), [...expected].sort());
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
  assert.match(section, new RegExp(`exactly ${words[Object.keys(events).length]} events`));
});

test('the privacy section says the Plausible site is shared with the app and library', () => {
  const page = read('src/pages/Disclaimer.jsx');
  assert.match(page, /Plausible site is shared/);
  assert.match(page, /app\.airiskpractice\.org/);
  assert.match(page, /library\.airiskpractice\.org/);
});

test('the page loads Plausible from plausible.io only, and no Google Fonts', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts.sort(), ['/plausible-init.js', '/src/main.jsx',
    'https://plausible.io/js/pa-KshwKmFS5HmfreqjImvCc.js'].sort());
  for (const f of ['index.html', 'public/_headers', ...sourceFiles('src')]) {
    assert.doesNotMatch(read(f), /fonts\.(googleapis|gstatic)\.com/, `${f} still refers to Google Fonts`);
  }
});
