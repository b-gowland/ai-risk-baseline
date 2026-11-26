// Text colours in src/styles/tokens.css must hold WCAG AA contrast (4.5:1)
// on the backgrounds they are used on.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const text = ['--auth-text-primary', '--auth-text-muted', '--auth-text-faint', '--color-amber', '--color-amber-dark'];
const grounds = ['--auth-bg', '--auth-bg-subtle', '--auth-bg-raised', '--color-amber-light'];
// The accent is 4.46:1 on its own wash, so wash panels use --color-amber-dark
// for text and keep the accent for borders.
const pairs = [
  ...text.flatMap((t) => grounds.map((g) => [t, g]))
    .filter(([t, g]) => !(t === '--color-amber' && g === '--color-amber-light')),
  ['--color-upcoming-text', '--color-upcoming-bg'],
  ['--color-mandatory-text', '--color-mandatory-bg'],
  ['--color-recommended-text', '--color-recommended-bg'],
  ['--color-effort-high-text', '--color-effort-high-bg'],
  ['--color-effort-med-text', '--color-effort-med-bg'],
  ['--color-effort-low-text', '--color-effort-low-bg'],
];

for (const [fg, bg] of pairs) {
  test(`${fg} on ${bg} is at least 4.5:1`, () => {
    assert.ok(tokens[fg] && tokens[bg], `missing token ${fg} or ${bg}`);
    const r = ratio(tokens[fg], tokens[bg]);
    assert.ok(r >= 4.5, `${fg} ${tokens[fg]} on ${bg} ${tokens[bg]} is ${r.toFixed(2)}:1`);
  });
}

test('white text on the accent and on ink buttons is at least 4.5:1', () => {
  for (const bg of ['--color-amber', '--auth-text-primary']) {
    assert.ok(ratio('#ffffff', tokens[bg]) >= 4.5, `white on ${bg}`);
  }
});
