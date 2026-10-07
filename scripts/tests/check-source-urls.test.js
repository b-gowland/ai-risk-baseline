import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkSource, collectSources, renderReport } from '../check-source-urls.js';

async function serverFor(t, handler) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}
const options = { timeoutMs: 500, retryDelayMs: 0 };
const source = url => ({ url, contexts: ['framework', 'mapping'] });

test('checks a repeated URL once and retains every context', () => {
  assert.deepEqual(collectSources({
    frameworks: [{ id: 'f', source_url: 'https://example.org/a#one' }],
    mappings: [{ id: 'm1', source_url: 'https://example.org/a#two' },
      { id: 'm2', source_url: 'https://example.org/a' }],
  }), [{ url: 'https://example.org/a', contexts: ['f', 'm1', 'm2'] }]);
});

test('follows relative redirects to detect a final 404', async t => {
  const base = await serverFor(t, (req, res) => {
    if (req.url === '/start') res.writeHead(302, { location: '/missing' }).end();
    else res.writeHead(404).end();
  });
  const result = await checkSource(source(`${base}/start`), options);
  assert.equal(result.category, 'broken');
  assert.equal(result.finalUrl, `${base}/missing`);
  assert.equal(result.attempts, 1);
});

test('access denied is blocked, not broken, and is not retried', async t => {
  let calls = 0;
  const base = await serverFor(t, (_, res) => { calls++; res.writeHead(403).end(); });
  const result = await checkSource(source(base), options);
  assert.equal(result.category, 'blocked');
  assert.equal(calls, 1);
});

test('retries temporary failure and preserves recovery history', async t => {
  let calls = 0;
  const base = await serverFor(t, (_, res) => res.writeHead(++calls < 3 ? 503 : 200).end());
  const result = await checkSource(source(base), options);
  assert.equal(result.category, 'healthy');
  assert.deepEqual(result.history.map(r => r.status), [503, 503, 200]);
});

test('timeout produces one result per attempt and respects retry limit', async t => {
  const base = await serverFor(t, () => {});
  const result = await checkSource(source(base), { ...options, timeoutMs: 30 });
  assert.equal(result.category, 'timeout');
  assert.equal(result.attempts, 3);
  assert.equal(result.history.length, 3);
});

test('redirect loops stop without retries', async t => {
  const base = await serverFor(t, (_, res) => res.writeHead(302, { location: '/' }).end());
  const result = await checkSource(source(base + '/'), options);
  assert.equal(result.category, 'redirect_error');
  assert.equal(result.attempts, 1);
});

test('invalid schemes and malformed URLs stay visible', async () => {
  for (const url of ['not a URL', 'file:///tmp/example']) {
    const result = await checkSource(source(url), options);
    assert.equal(result.category, 'invalid_url');
    assert.equal(result.attempts, 1);
  }
});

test('rate limiting remains transient after bounded retries', async t => {
  const base = await serverFor(t, (_, res) => res.writeHead(429).end());
  const result = await checkSource(source(base), options);
  assert.equal(result.category, 'transient');
  assert.equal(result.attempts, 3);
});

test('report includes outcomes, references and final redirect destination', () => {
  const report = renderReport([{ ...source('https://example.org/old'), category: 'broken',
    status: 404, attempts: 1, finalUrl: 'https://example.org/gone' }]);
  assert.match(report, /framework, mapping/);
  assert.match(report, /https:\/\/example.org\/gone/);
  assert.match(report, /HTTP 401\/403/);
});
