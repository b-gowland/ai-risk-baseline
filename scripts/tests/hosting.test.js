// Hosting files for Cloudflare Pages. With public/404.html in the build,
// Cloudflare serves it (status 404) for any path that is not a file, so every
// route in src/App.jsx needs a 200 rewrite in public/_redirects, and nothing
// else should have one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');

const appRoutes = [...read('src/App.jsx').matchAll(/<Route path="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((p) => p !== '/' && p !== '*')
  .map((p) => p.replace(/\/:[^/]+$/, '/*'));

const rewrites = read('public/_redirects').split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/\s+/));

test('every app route has a 200 rewrite to the app shell, and no extra ones', () => {
  const shell = rewrites.filter((r) => r[2] === '200');
  for (const r of shell) assert.equal(r[1], '/', `bad rule: ${r.join(' ')}`);
  assert.deepEqual(shell.map((r) => r[0]).sort(), [...appRoutes].sort());
});

test('trailing-slash redirects point at a route without the slash', () => {
  const moved = rewrites.filter((r) => r[2] !== '200');
  for (const [from, to, code] of moved) {
    assert.equal(code, '301', `bad rule: ${from}`);
    assert.equal(from, `${to}/`);
    assert.ok(appRoutes.includes(to), `${to} is not an app route`);
  }
});

test('404.html, _headers and _redirects are in public/ so they reach the build', () => {
  for (const f of ['404.html', '_headers', '_redirects', 'plausible-init.js']) {
    assert.ok(existsSync(`${root}public/${f}`), `public/${f} is missing`);
  }
});

test('the CSP is a header, allows only this site and plausible.io, and allows embedding', () => {
  const csp = read('public/_headers').match(/Content-Security-Policy: (.+)/)?.[1];
  assert.ok(csp, 'no Content-Security-Policy in public/_headers');
  assert.match(csp, /script-src 'self' https:\/\/plausible\.io;/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(csp, /frame-ancestors/, 'embedding is allowed on purpose: no frame-ancestors');
  assert.doesNotMatch(csp, /unsafe-eval|google/);
});
