# AI Governance Baseline

**Part of [AI Risk Practice](https://airiskpractice.org) — free, open-source AI risk literacy.**

The AI Governance Baseline is a free, browser-based governance profiler. Describe your AI system in five questions; get a tailored risk and control profile mapped to applicable regulatory frameworks.

**Live:** [airiskpractice.org/baseline](https://airiskpractice.org/baseline)

---

## What it does

- **Regulatory tab** — applicable framework citations (EU AI Act, NIST AI RMF, ISO 42001, AU Privacy Act, APRA CPS 230, and more) with article numbers, deadlines, and links to primary sources
- **Risks tab** — top 7 ranked risks for your configuration, each linking to the AI Risk Practice knowledge base
- **Controls tab** — specific controls filtered by function (Risk · Legal · Tech · Procurement), each with owner, effort, and framework references
- **Actions tab** — 5 prioritised next steps with owners and effort estimates
- **Shareable URL** — the full configuration is encoded in the URL; share it with your team

No login. No signup. No data collected. Computes entirely in the browser.

---

## The other tools

| Tool | URL | Purpose |
|---|---|---|
| Knowledge base | [library.airiskpractice.org](https://library.airiskpractice.org) | 32 AI risk entries, four depth layers each |
| Training (Fork) | [app.airiskpractice.org](https://app.airiskpractice.org) | Interactive branching scenarios, 26 practitioner cases |
| **Baseline** (this) | [airiskpractice.org/baseline](https://airiskpractice.org/baseline) | Tailored governance profile for your system |

---

## Tech stack

- React 19 + Vite
- React Router DOM (BrowserRouter + 404.html SPA fallback)
- Plain CSS with design tokens from the AI Risk Practice design system
- No backend. No database. URL state only.
- Deployed on GitHub Pages

---

## Licence

- **Code:** Apache 2.0 — see [LICENSE](./LICENSE)
- **Content (data files):** CC BY 4.0 — see [LICENSE-content](./LICENSE-content)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to propose new regulatory mappings, controls, or risk weights.

The data files in `src/data/` are the primary contribution surface. Adding a new jurisdiction requires only data file edits — no React code changes.

---

## Contact

hello@airiskpractice.org
