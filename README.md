# AI Governance Baseline

**Part of [AI Risk Practice](https://airiskpractice.org) — free, open-source AI risk literacy.**

The AI Governance Baseline is a free, browser-based governance profiler. Describe your AI system in five questions; get a tailored risk and control profile mapped to applicable regulatory frameworks.

**Live:** [baseline.airiskpractice.org](https://baseline.airiskpractice.org)

**Status: v2 rebuild in progress.** The live site (v1) stays up and free to use, but its EU AI Act classification has known errors (see below). Don't rely on it to decide whether a system is prohibited or high-risk. v2 replaces v1 in place when it ships.

---

## v2: what's changing and why

A [first-principles review](./docs/first-principles-review.md) found that v1 classifies systems by *technology*, while the EU AI Act, ISO/IEC 42001/23894 and NIST AI RMF all start from *intended purpose, role and impact*. As a result, v1 gets the EU AI Act classification wrong in common cases. For example, it shows fraud detection as high-risk, misses that workplace emotion recognition is prohibited, and loses credit scoring as high-risk when the scorer is an LLM.

v2 is built around:

- **Purpose-first classification.** Steps through the prohibited-practice screen, Annex I, Annex III, the Art. 6(3) exemption, Art. 50 transparency and roles, with a "because" trace behind every result.
- **A governance tier (1–4).** Comes from a published impact × autonomy matrix and tells you how much governance a use case needs, whether or not the EU AI Act applies.
- **Requirements by role and lifecycle gate.** EU AI Act articles crosswalked to ISO/IEC 42001 and NIST AI RMF, each with the artefact it produces.
- **"Unsure" answers become open questions** with stated conservative assumptions, never an empty result.
- **A global core** (EU AI Act, ISO/IEC, NIST) with optional country packs (GDPR, UK, AU).

| Phase | Status |
|---|---|
| 1. Spec, purpose catalogue, tier matrix, golden scenarios | **Done**: [classification spec](./docs/v2/classification-spec.md), [`src/v2/`](./src/v2/), verified against the Official Journal text of Reg. (EU) 2024/1689 and 2026/1744 |
| 2. Classification engine | Next |
| 3. Requirements library (EU AI Act + ISO/IEC + NIST crosswalk) | Planned |
| 4. Questionnaire and output UX | Planned |
| 5. Release: v2 replaces v1 | Planned |

---

## What v1 does (live site)

- **Governance roadmap** — controls laid out by function (Risk · Legal · Tech · Procurement) and lifecycle phase, mandatory items flagged
- **Key dates** — upcoming and recently commenced obligations for your configuration
- **Regulatory panel** — applicable framework citations (EU AI Act, NIST AI RMF, ISO 42001, AU Privacy Act, APRA CPS 230, UK GDPR, OWASP and more) with article numbers, effective dates, and links to primary sources
- **Risks panel** — top 7 ranked risks for your configuration, each linking to the AI Risk Practice knowledge base
- **Controls panel** — specific controls with owner, effort, and framework references
- **Actions panel** — 5 prioritised next steps with owners and effort estimates
- **Shareable URL** — the full configuration is encoded in the URL; share it with your team

No login. No signup. Your answers never leave the browser: everything is computed client-side and stored only in the URL. Cookieless, aggregate analytics (Plausible), as on the other AI Risk Practice sites.

---

## The other tools

| Tool | URL | Purpose |
|---|---|---|
| Knowledge base | [library.airiskpractice.org](https://library.airiskpractice.org) | 32 AI risk entries, four depth layers each |
| Training | [app.airiskpractice.org](https://app.airiskpractice.org) | Choose-your-own-adventure AI risk scenarios, at home and at work |
| **Baseline** (this) | [baseline.airiskpractice.org](https://baseline.airiskpractice.org) | Tailored governance profile for your system |

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

See [CONTRIBUTING.md](./CONTRIBUTING.md).

The most valuable contributions now are to v2:
- corrections to the [classification spec](./docs/v2/classification-spec.md);
- new edge-case scenarios in [`src/v2/golden/scenarios.json`](./src/v2/golden/scenarios.json), each citing the provision it relies on.

v1 data files in `src/data/` take fixes only.

---

## Contact

hello@airiskpractice.org
