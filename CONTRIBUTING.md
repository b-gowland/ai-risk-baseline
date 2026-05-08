# Contributing to AI Governance Baseline

Thank you for considering a contribution. This project is an open-source AI governance resource; all contributions are public and licensed under Apache 2.0 (code) and CC BY 4.0 (content).

---

## What can I contribute?

### Regulatory mappings (highest value)

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
5. Run `node scripts/validate-data.js` to check schema validity
6. Open a pull request with a brief description of what you changed and why

---

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
