# Contributing to AI Governance Baseline

Thank you for considering a contribution. This project is an open-source AI governance resource; all contributions are public and licensed under Apache 2.0 (code) and CC BY 4.0 (content).

---

## What can I contribute?

### Classification rules and golden scenarios (highest value)

The Baseline classifies an AI use case by intended purpose, role and impact (see [docs/first-principles-review.md](./docs/first-principles-review.md) for why). The spec is the source of truth:

| File | What it holds |
|---|---|
| `docs/v2/classification-spec.md` | The classification pipeline, obligation rules, governance tier, requirements library rules and verification register |
| `src/v2/data/purposes.json` | Purpose catalogue, mapped to EU AI Act Annex III |
| `src/v2/data/prohibited-practices.json` | Art. 5 screen questions |
| `src/v2/data/eu-obligations.json` | EU obligation keys, roles and dates |
| `src/v2/data/requirements.json` | Requirements library: artefacts and the EU AI Act, ISO/IEC and NIST crosswalk |
| `src/v2/data/tier-matrix.json` | Governance tier rules |
| `src/v2/data/answer-model.json` | Questionnaire fields and allowed values |
| `src/v2/golden/scenarios.json` | Golden scenarios: the executable form of the spec |

**Adding or correcting a golden scenario:**
- Cite the provision you rely on in `basis_refs` (article, recital or Commission guideline).
- Keep `answers` minimal: they are merged over `defaults`.
- Prefer edge cases: carve-outs, exceptions, condition failures, role shifts under Art. 25.
- If a scenario and the spec disagree, fix both in the same pull request.

**Changing a legal rule:**
- Cite the primary text on EUR-Lex, not a summary.
- Update the verification register in §8 of the spec.

**Changing a requirement or the crosswalk:**
- Every requirement needs an `artefact` that says what "done" looks like.
- ISO/IEC standards are paywalled: cite clause and control numbers with your own paraphrase, and never paste standard text.
- NIST references use the subcategory ids from NIST AI 100-1 (e.g. `MAP 1.1`) or the risk names from NIST AI 600-1.
- Do not use phrases like "compliant" or "compliance achieved". The tool tells users what applies, not whether they have done it.

### Country packs

Country packs (GDPR, UK, Australia and others) are planned as optional additions on the same requirement schema. Open an issue to discuss scope before starting one.

### Bug fixes and UI improvements

Standard PR flow. The questionnaire, output page and exports are in `src/v2/ui/`, and the engine is in `src/v2/engine/`.

---

## How to contribute

1. Fork the repo
2. Clone your fork locally
3. `npm install`
4. Make your changes
5. Run `npm run validate`, `npm test`, and `npm run build`. They check data integrity, run the golden suite against the engine, and build the site.
6. Open a pull request with a brief description of what you changed and why

`npm run validate` checks:
- that the data files parse and their ids are unique;
- that every requirement source names a known framework and EU obligation;
- that every EU obligation is covered by at least one requirement;
- that each framework has a recent `last_verified` date.

`npm test` checks:
- every golden scenario against the engine;
- the requirements library and the first-actions ordering;
- the UI's pure functions (URL state, exports).

---

## Source URL health checks

Run `npm run check:urls` to check the source URLs in the requirements library (`src/v2/data/requirements.json`: each framework's URL and any per-source URL). It checks each unique URL once while retaining every reference to it, follows up to five redirects, and retries temporary failures at most twice. Each attempt has a 15-second deadline.

Reports are written to `reports/url-health.md` and `.json`. HTTP 404/410 means broken; 401/403 means blocked. Timeouts, network errors and temporary server/rate-limit failures remain distinct and need investigation. Any unresolved result makes the command exit nonzero. The scheduled workflow uploads the evidence and updates an existing maintenance issue rather than opening duplicates. Local runs never create issues.

`npm test` includes offline HTTP-server regressions for this checker; it does not contact the public source sites.

## Regulatory date checks

Run `npm run check:dates` to list EU obligations and requirements whose application date has passed since they were last verified. Legislators often move dates late, so each one needs re-checking against its primary source once the date arrives.

After confirming (or correcting) a date:
- update `effective_from` in `src/v2/data/eu-obligations.json` or `requirements.json`;
- update `last_verified`;
- update the spec's verification register.

A scheduled workflow runs this twice a month and keeps a single maintenance issue up to date.

## Predicate language reference

`show_when` (answer model, prohibited screen) and `annex_iii_condition` (purposes) use a small predicate language over questionnaire answers:

```json
{
  "any": [
    { "purpose": ["synthetic_media_generation", "content_generation"] },
    { "interaction": ["generates_synthetic_content", "deepfake"] }
  ]
}
```

- `all` → logical AND
- `any` → logical OR
- Leaf: `{ "field": ["allowed", "values"] }`. It matches if the answer is one of the values or, for multi-select fields, if the two sets intersect.
- `{ "annex_iii_matched": true }` matches once the purpose maps to Annex III.

See §2 of the spec.

---

## Questions?

Open an issue or email hello@airiskpractice.org
