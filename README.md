# AI Governance Baseline

**Part of [AI Risk Practice](https://airiskpractice.org) — free, open-source AI risk literacy.**

The AI Governance Baseline is a free, browser-based tool for AI governance leads, from a one-person team to an enterprise. Describe one AI use case by its intended purpose, your role and its impact, and get a starting baseline: its EU AI Act classification, a governance tier, the requirements that apply (crosswalked to ISO/IEC and NIST), your first five actions, and the open questions to escalate.

**Live:** [baseline.airiskpractice.org](https://baseline.airiskpractice.org)

---

## What it does

- **EU AI Act classification.** Works through Art. 2 scope, Art. 5 prohibitions, Annex I, Annex III and the Art. 6(3) exemption, Art. 50 transparency, and your role (provider, deployer, importer or distributor, including Art. 25 role shifts). A "because" trace shows the answers and articles behind every result.
- **Governance tier (1–4).** Comes from a published matrix of worst plausible harm × autonomy, raised for vulnerable people and sensitive data, with EU high-risk as a floor. It applies whether or not the EU AI Act does.
- **Requirements by lifecycle gate.** Each has an owner, an effort rating, the artefact it produces, and references to the EU AI Act, ISO/IEC 42001, 23894 and 42005, and the NIST AI RMF and Generative AI Profile.
- **First five actions,** ordered by dependency rather than effort.
- **Open questions.** Every "Unsure" answer becomes a question to escalate, with the cautious assumption used meanwhile. Blocking ones come first.
- **Country packs.** GDPR, UK and Australian data protection requirements, each by lifecycle gate with its sources.
- **Shareable URL and exports.** The answers live in the link. Export as Markdown, JSON or CSV.

No login. No signup. Your answers never leave the browser: everything is computed client-side and stored only in the URL. Cookieless, aggregate analytics (Plausible), as on the other AI Risk Practice sites.

---

## How it's built, and why

Version 2 (October 2026) replaced the original tool after a [first-principles review](./docs/first-principles-review.md). The review found that v1 classified systems by *technology*, while the EU AI Act, ISO/IEC 42001/23894 and the NIST AI RMF all start from *intended purpose, role and impact*.

| Piece | Where |
|---|---|
| Classification spec and verification register (checked against the Official Journal text of Reg. (EU) 2024/1689 and 2026/1744) | [`docs/v2/classification-spec.md`](./docs/v2/classification-spec.md) |
| Purpose catalogue, Art. 5 screen, EU obligations, tier matrix, requirements library | [`src/v2/data/`](./src/v2/data/) |
| Classification engine (pure functions) | [`src/v2/engine/`](./src/v2/engine/) |
| Golden legal scenarios, each citing its provision | [`src/v2/golden/scenarios.json`](./src/v2/golden/scenarios.json) |
| Questionnaire, output page and exports | [`src/v2/ui/`](./src/v2/ui/) |

**Scope:** the core is the EU AI Act plus ISO/IEC and NIST. Country packs add data protection and national guidance on top: **GDPR** (added automatically with an EU connection and personal data), the **UK** (UK GDPR as amended by the Data (Use and Access) Act 2025, ICO guidance) and **Australia** (Privacy Act and APPs, including APP 1.7–1.9 from 10 December 2026, OAIC guidance, Guidance for AI Adoption), in [`src/v2/packs/`](./src/v2/packs/). ISO/IEC standards are paywalled, so they are cited by clause and control number and title, verified against NIST's official crosswalks, with original paraphrase only.

---

## The other tools

| Tool | URL | Purpose |
|---|---|---|
| Knowledge base | [library.airiskpractice.org](https://library.airiskpractice.org) | 32 AI risk entries, four depth layers each |
| Training | [app.airiskpractice.org](https://app.airiskpractice.org) | Choose-your-own-adventure AI risk scenarios, at home and at work |
| **Baseline** (this) | [baseline.airiskpractice.org](https://baseline.airiskpractice.org) | Governance baseline for an AI use case |

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

The most valuable contributions are:
- corrections to the [classification spec](./docs/v2/classification-spec.md) or the ISO/IEC and NIST crosswalk, citing the primary text;
- new edge-case scenarios in [`src/v2/golden/scenarios.json`](./src/v2/golden/scenarios.json), each citing the provision it relies on;
- new country packs, or corrections to the existing ones (GDPR, UK, Australia).

---

## Contact

hello@airiskpractice.org
