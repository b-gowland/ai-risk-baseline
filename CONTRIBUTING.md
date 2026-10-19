# Contributing to AI Governance Baseline

Thank you for considering a contribution. This project is an open-source AI governance resource; all contributions are public and licensed under Apache 2.0 (code) and CC BY 4.0 (content).

---

## What can I contribute?

### v2 classification spec and golden scenarios (highest value)

v2 is being rebuilt around purpose-first classification (see [docs/first-principles-review.md](./docs/first-principles-review.md)). The spec is the source of truth:

| File | What it holds |
|---|---|
| `docs/v2/classification-spec.md` | The classification pipeline, obligation rules, governance tier and verification register |
| `src/v2/data/purposes.json` | Purpose catalogue, mapped to EU AI Act Annex III |
| `src/v2/data/prohibited-practices.json` | Art. 5 screen questions |
| `src/v2/data/eu-obligations.json` | EU obligation keys, roles and dates |
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

`npm test` runs `scripts/tests/golden-v2.test.js`. It checks that every scenario is valid against the data files and that each expected tier follows `tier-matrix.json`. Once `src/v2/engine/classify.js` exists, it also checks that the engine matches every scenario.

### v1 regulatory mappings (fixes only)

v1 (`src/data/`) remains live until v2 ships. Fixes to wrong citations or dates are welcome; new mappings should go into v2 instead.

The `src/data/regulatory-mappings.json` file maps configuration conditions to regulatory citations. Adding a new jurisdiction, a new framework, or a new article-level mapping is a pure data-file contribution — no React code required.

**Before submitting a mapping:**
- Verify the article/clause number against the primary source text
- Include a `source_url` pointing to the primary source (not a summary or news article)
- Include a `_source_note` string documenting what you verified and when
- Include `effective_from` and (if relevant) `effective_until` dates in ISO 8601 format
- Do not include phrases like "compliant" or "compliance achieved" — the tool tells users what to do, not whether they have done it

### Risk weights (`risks-mappings.json`)

If you believe a risk's weight for a particular configuration is wrong, open an issue with the reasoning. PRs to adjust weights are welcome but need a brief rationale.

### Controls (`controls-index.json`)

New controls must:
- Reference at least one framework clause (e.g. `eu_ai_act_art_9`) **and/or** one KB entry (e.g. `e1`)
- Specify `effort` as one of: `Low`, `Medium`, `High`
- Specify `owners` from: `risk`, `legal`, `tech`, `procurement`
- Include an `applies_when` predicate consistent with the predicate language in `src/engine/predicate.js`

### Bug fixes and UI improvements

Standard PR flow. Run `npm run validate` before submitting — this checks all data file schemas.

---

## How to contribute

1. Fork the repo
2. Clone your fork locally
3. `npm install`
4. Make your changes in `src/data/` (for content) or `src/` (for code)
5. Run `npm run validate`, `npm test`, and `npm run build` to check data schemas, engine behaviour, and the production build.
6. Open a pull request with a brief description of what you changed and why

---

## Source URL health checks

Run `npm run check:urls` to check the public URLs in regulatory mappings. It checks each unique URL once while retaining all framework/mapping references, follows up to five redirects, and retries temporary failures at most twice. Each attempt has a 15-second deadline.

Reports are written to `reports/url-health.md` and `.json`. HTTP 404/410 means broken; 401/403 means blocked. Timeouts, network errors and temporary server/rate-limit failures remain distinct and need investigation. Any unresolved result makes the command exit nonzero. The scheduled workflow uploads the evidence and updates an existing maintenance issue rather than opening duplicates. Local runs never create issues.

`npm test` includes offline HTTP-server regressions for this checker; it does not contact the public source sites.

## Regulatory date checks

Run `npm run check:dates` to list mappings whose `effective_from` date has passed since their `last_verified` date. The site shows those items as "In force" based on a review done before the date arrived, and legislators often move dates late, so each one needs re-checking against its primary source. After confirming (or correcting) the date, update `effective_from` and `last_verified`. A scheduled workflow runs this twice a month and keeps a single maintenance issue up to date.

## Predicate language reference

The `applies_when` field uses a small predicate language:

```json
{
  "all": [
    { "jurisdiction": ["eu"] },
    { "any": [
      { "system_type": ["predictive", "automated_decision"] },
      { "context.domain": ["financial_services"] }
    ] }
  ]
}
```

- `all` → logical AND
- `any` → logical OR
- Leaf: `{ "field.path": ["allowed", "values"] }` — field path supports dot notation for nested config fields

---

## Questions?

Open an issue or email hello@airiskpractice.org
