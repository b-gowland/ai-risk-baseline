# AI Governance Baseline: notes for Claude

Free, open-source governance profiler (baseline.airiskpractice.org). Describe
one AI use case by purpose, role and impact; get its EU AI Act classification,
a governance tier, requirements crosswalked to ISO/IEC and NIST, first actions
and open questions. Everything runs in the browser; answers live only in the URL.

React 19 + Vite, BrowserRouter (real paths, no hash). Hosted on Cloudflare Pages
(project `ai-risk-baseline`), deployed by GitHub Actions (`.github/workflows/deploy.yml`)
on push to `main`. Companion sites: `b-gowland/ai-risk-training` (practice
scenarios, app.airiskpractice.org) and `b-gowland/ai-risk-kb` (reference
library, library.airiskpractice.org). Cross-site standards are in
ai-risk-training's [`docs/OPERATING_MODEL.md`](https://github.com/b-gowland/ai-risk-training/blob/main/docs/OPERATING_MODEL.md).

Start with [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md); the
legal rules are in [`docs/v2/classification-spec.md`](docs/v2/classification-spec.md).

## Before you push

Run what CI runs: `npm run validate`, `npm test`, `npm run build`. After changing
a date, a source or a URL in `src/v2/data/` or `src/v2/packs/`, also run
`npm run check:dates` and `npm run check:urls` (the scheduled workflows run
them too).

After changing routes or anything in `public/`, check the build in Cloudflare's
local emulator: `npm run build && npx --yes wrangler@4.163.0 pages dev dist --port 8788 --ip 127.0.0.1`,
then curl each route (200) and a junk path (404), and load the main pages in a
browser looking for Content-Security-Policy errors in the console.

## Rules that are easy to break

- **Plain language, Australian English.** Write for a governance lead who is not
  a lawyer. Avoid machine-writing patterns: "isn't X. It's Y" contrasts,
  aphorism closers, filler intensifiers, signposting.
- **Sources for dated regulatory claims.** Every article, date or obligation cites
  the primary text (EUR-Lex for the EU AI Act), with a `last_verified` date, and
  the spec's verification register is updated in the same change. Never claim a
  system is "compliant".
- **Routes and hosting files go together.** A new route in `src/App.jsx` needs a
  200 rewrite in `public/_redirects`, or Cloudflare serves `public/404.html`
  with status 404 (`scripts/tests/hosting.test.js` checks this).
- **Privacy:** the site runs Plausible on the site shared with the app and the
  library (airiskpractice.org). Add no new tracking or data collection. Every
  event lives in `src/utils/analytics.js` and is listed in the privacy section
  of `/disclaimer`; `scripts/tests/privacy-claims.test.js` checks they match.
  Fonts are self-hosted (`@fontsource` packages): don't add Google Fonts or other
  third-party hosts.
- **Design tokens:** colours and fonts come from `src/styles/tokens.css`, which
  follows the practice scenarios app. Text colours must hold 4.5:1
  (`scripts/tests/tokens-contrast.test.js`).
- **Invented names** must not belong to real organisations, and example domains
  use `.example`.

## Hosting

- Don't change hosting, DNS or Cloudflare settings. List the change for the owner
  to make.
- `public/_headers` (security headers and the CSP), `public/_redirects` and
  `public/404.html` must stay in the build. The CSP has no `frame-ancestors` on
  purpose: embedding is allowed, as for the app. If you add a script, font or
  connection host, update the CSP and check it in the emulator.

## Keep work in the repo

Cloud containers can be rebuilt and lose anything not pushed (this happened in
November 2026). Commit plans and reviews to `docs/`, not scratch files, and push
work to a branch before stopping.
