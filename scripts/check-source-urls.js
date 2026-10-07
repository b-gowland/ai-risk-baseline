import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export function collectSources(data) {
  const sources = new Map();
  for (const entry of [...data.frameworks, ...data.mappings]) {
    if (!entry.source_url) continue;
    let url = entry.source_url;
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      url = parsed.href;
    } catch { /* Keep invalid URLs so the report identifies them. */ }
    if (!sources.has(url)) sources.set(url, new Set());
    sources.get(url).add(entry.id);
  }
  return [...sources].map(([url, contexts]) => ({ url, contexts: [...contexts] }));
}

async function attempt(url, { timeoutMs, maxRedirects, fetchImpl }) {
  const signal = AbortSignal.timeout(timeoutMs);
  const visited = new Set();
  let current = url;
  try {
    for (let redirects = 0; ; redirects++) {
      const parsed = new URL(current);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { category: 'invalid_url', finalUrl: current, detail: 'Expected HTTP(S)' };
      }
      if (visited.has(current) || redirects > maxRedirects) {
        return { category: 'redirect_error', finalUrl: current, detail: 'Redirect loop or limit' };
      }
      visited.add(current);
      const res = await fetchImpl(current, {
        redirect: 'manual', signal,
        headers: { 'User-Agent': 'AI-Risk-Baseline-Link-Check/1.0' },
      });
      const status = res.status;
      const location = res.headers.get('location');
      await res.body?.cancel();
      if ([301, 302, 303, 307, 308].includes(status)) {
        if (!location) return { category: 'redirect_error', status, finalUrl: current,
          detail: 'Redirect without Location' };
        current = new URL(location, current).href;
        continue;
      }
      const category = status >= 200 && status < 300 ? 'healthy'
        : [404, 410].includes(status) ? 'broken'
        : [401, 403].includes(status) ? 'blocked'
        : status === 429 || status >= 500 ? 'transient'
        : 'http_error';
      return { category, status, finalUrl: current };
    }
  } catch (error) {
    return { category: signal.aborted ? 'timeout'
      : error.code === 'ERR_INVALID_URL' ? 'invalid_url' : 'network_error',
    finalUrl: current, detail: signal.aborted ? 'Request deadline exceeded' : error.message };
  }
}

export async function checkSource(source, options = {}) {
  const settings = { timeoutMs: 15000, maxRedirects: 5, maxAttempts: 3,
    retryDelayMs: 500, fetchImpl: fetch, sleepImpl: sleep, ...options };
  const history = [];
  for (let n = 1; n <= settings.maxAttempts; n++) {
    const result = await attempt(source.url, settings);
    history.push(result);
    if (!['transient', 'timeout', 'network_error'].includes(result.category)
        || n === settings.maxAttempts) {
      return { ...source, ...result, attempts: n, history };
    }
    await settings.sleepImpl(settings.retryDelayMs * n);
  }
}

const cell = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
export function renderReport(results) {
  const attention = results.filter(r => r.category !== 'healthy');
  const lines = ['# Source URL health report', '',
    `Checked ${results.length} unique URLs; ${attention.length} need attention.`, '',
    'Broken means HTTP 404/410. Blocked means HTTP 401/403. Timeouts, network errors and '
      + 'temporary server/rate-limit failures do not establish that a link is broken.', '',
    '| Outcome | Source URL | References | HTTP | Attempts | Final URL / detail |',
    '|---|---|---|---|---|---|'];
  for (const r of attention) lines.push(`| ${cell(r.category)} | ${cell(r.url)} | `
    + `${cell(r.contexts.join(', '))} | ${r.status ?? '—'} | ${r.attempts} | `
    + `${cell(r.finalUrl)} ${cell(r.detail)} |`);
  if (!attention.length) lines.push('', 'All checked source URLs responded successfully.');
  lines.push('', 'The JSON artifact includes every result and each attempt, including recovered failures.');
  return lines.join('\n') + '\n';
}

export async function run(input = 'src/data/regulatory-mappings.json', output = 'reports/url-health') {
  const data = JSON.parse(await fs.readFile(input, 'utf8'));
  const results = [];
  for (const source of collectSources(data)) results.push(await checkSource(source));
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(`${output}.json`, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  await fs.writeFile(`${output}.md`, renderReport(results));
  console.log(renderReport(results));
  return results.some(r => r.category !== 'healthy') ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(code => { process.exitCode = code; }).catch(error => {
    console.error(`URL checker failed: ${error.message}`);
    process.exitCode = 1;
  });
}
