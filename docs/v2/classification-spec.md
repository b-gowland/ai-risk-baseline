# v2 classification spec

**Status:** Phase 1 draft · **Date:** 2026-10-20 · **Law as of:** Regulation (EU) 2024/1689 as amended by Regulation (EU) 2026/1744 (Digital Omnibus on AI; in force 27 July 2026)

This spec defines how v2 turns questionnaire answers into an EU AI Act classification, a list of roles and obligations, a governance tier and a list of open questions. The Phase 2 engine implements it, and the golden suite (`src/v2/golden/scenarios.json`) is its executable form. If the spec and the golden suite disagree, that is a bug in one of them, and both are fixed in the same change.

**Data files**

| File | Contents |
|---|---|
| `src/v2/data/answer-model.json` | Questionnaire fields and allowed values |
| `src/v2/data/purposes.json` | Purpose catalogue (Annex III mapping and carve-outs) |
| `src/v2/data/prohibited-practices.json` | Art. 5 screen |
| `src/v2/data/eu-obligations.json` | Provisional EU obligation keys and dates |
| `src/v2/data/tier-matrix.json` | Governance tier rules |

---

## 1. Principles

1. **Purpose, not technology.** Annex III classification comes only from `purpose` (plus `org_type` for 5(a)). `tech` never changes the legal result.
2. **Role decides the obligations.** The system has a status; each obligation attaches to a role.
3. **Never silent.** Every `unsure` answer becomes an *open question* with a stated conservative assumption. No combination of answers produces an empty result.
4. **Traceable.** Every status, obligation and tier adjustment records the answer(s) and the rule that produced it (`trace`).
5. **Assistive, not determinative.** The output is a starting point for the governance lead, not a legal opinion.

## 2. Answer model and predicates

The fields are listed in `answer-model.json`. Multi-select fields are arrays; `prohibited` and `art_6_3` are maps of key → `yes | no | unsure`.

**Predicates** (used in `show_when` and `annex_iii_condition`):

- `{ "all": [...] }` means AND, and `{ "any": [...] }` means OR.
- A leaf is `{ field: [values] }`. It matches if the answer equals one of the values, or, for multi-select fields, if the two sets intersect.
- The special leaf `{ "annex_iii_matched": true }` matches after step 3 when a purpose maps to Annex III.

**Unanswered fields:**

- `prohibited.*` defaults to `no` when the item was not shown. In the questionnaire, items that are shown are required. In the golden suite, unanswered shown items also default to `no`, to keep scenarios short.
- `art_6_3.*` defaults to `no` (the conditions are not met).
- `interaction` defaults to `[]`.
- Every other unanswered field is treated as `unsure`.

## 3. Classification pipeline

The output shape is:

```text
result = {
  scope:      in | out | undetermined,
  status:     prohibited | high_risk | not_high_risk_6_3 | transparency | minimal | out_of_scope,
  basis:      e.g. "annex_iii.5(b)" | "annex_i" | "art_5_1f" | null,
  provisional: boolean,   // true if any assumption was applied to reach status
  roles:      [provider, deployer, importer_distributor, gpai_provider],
  obligations: [eu.*],
  tier:       1..4 | "P",
  open_questions: [{ gate, field, assumption, blocking }],
  trace:      [{ step, rule, because: [answers] }]
}
```

The steps run in order. A step can end the pipeline early, but it always records why.

### Step 0: territorial and material scope (Art. 2)

| Answer | Result |
|---|---|
| `eu_nexus = no` | `scope=out`, `status=out_of_scope`. The tier and the core (ISO/NIST) baseline are still produced. |
| `eu_nexus = unsure` | `scope=undetermined`. Continue as if in scope; open question `eu_nexus`, assumption "treat as in scope", **provisional**. |
| `scope_exclusion` ∈ military_defence_national_security, scientific_research_only, pre_market_research, personal_non_professional | `scope=out`, `status=out_of_scope`. Note: real-world testing is not covered by the pre-market exclusion. |
| `scope_exclusion = free_open_source` | Evaluate steps 1–5. If the result is `prohibited`, `high_risk` or `transparency`, stay in scope (Art. 2(12)). Otherwise `scope=out`. |
| `scope_exclusion = unsure` | Open question; continue as in scope. |

### Step 1: prohibited practices (Art. 5)

The items shown are those whose `show_when` matches.

- Any shown item = `yes` → `status=prohibited`, `basis=<item id>`, obligations `eu.<item id>`, `tier=P`. **Stop.** No further obligations are listed, and nothing else should be built on top of the use case.
- Any shown item = `unsure` (and none `yes`) → open question, `blocking: true`, assumption "treat as potentially prohibited: do not deploy until resolved". Continue so the user can see what else would apply. `provisional=true`.
- For prohibitions with a future `effective_from` (2026 amendment items), the classification still says prohibited, and the date is shown alongside it.

### Step 2: Annex I product route (Art. 6(1))

This step only runs when the `annex_i_product` question is shown.

- `yes` → `status=high_risk`, `basis=annex_i`. Obligation dates come from `dates.annex_i` (2 Aug 2028).
- `unsure` → open question. Assumption: **high-risk via Annex I** (provisional), because the purposes that trigger this question are medical and safety ones.
- Annex I Section B products (vehicles, aviation, marine, rail and, since 2026, machinery) apply AI Act obligations only through their sectoral acts. v2 treats Section B as an open question, not as high-risk. *(Future question.)*

### Step 3: Annex III (Art. 6(2))

- If the purpose has an `annex_iii` reference and its `annex_iii_condition` (if any) matches → candidate `high_risk`, `basis=annex_iii.<ref>`.
- If the condition answer is `unsure` → candidate `high_risk`, provisional, open question `annex_iii_condition`.
- If `purpose = unsure` → candidate `high_risk`, `basis=null`, provisional, open question `purpose`, `blocking: true`.
- If Step 2 already set `annex_i` and an Annex III purpose also matches, keep both bases. Annex I governs the dates.

### Step 4: Art. 6(3) derogation

This step only runs for an Annex III candidate.

| `art_6_3` answers | Result |
|---|---|
| `profiling = yes` | `high_risk`. The derogation is unavailable; record that in the trace. |
| `profiling = no` and any condition `yes` | `status=not_high_risk_6_3`. Provider obligations `eu.art_6_4` and `eu.art_49_2` (see verification register). |
| `profiling = unsure`, or only `unsure` conditions | `high_risk`, provisional, open question `art_6_3`. |
| All conditions `no` | `high_risk`. |

The derogation is the provider's call (Art. 6(4)). A deployer of a vendor system should rely on the provider's documented assessment, so for `deploy_vendor` the trace asks the user to obtain that assessment from the vendor.

### Step 5: transparency (Art. 50)

Art. 50 can apply on top of any status other than `prohibited` and `out_of_scope`.

| `interaction` value | Obligation | Role |
|---|---|---|
| `interacts_directly` | `eu.art_50_1` | provider |
| `generates_synthetic_content` | `eu.art_50_2` | provider |
| `emotion_or_biometric_categorisation`, or purpose `emotion_recognition` or `biometric_categorisation` | `eu.art_50_3` | deployer |
| `deepfake` | `eu.art_50_4` | deployer |
| `public_interest_text` | `eu.art_50_4` | deployer (only when there is no human editorial responsibility) |

If no higher status applies and any Art. 50 trigger is present, then `status=transparency`. The status describes the **system**. If the user's role doesn't hold the obligation (e.g. a deployer of a vendor chatbot), the output says "this duty sits with your provider: check they meet it" and does **not** list the obligation as theirs.

Otherwise, `status=minimal`.

### Step 6: roles (Art. 3, Art. 25)

| `role` value | Roles |
|---|---|
| `build_own_use` | provider + deployer (putting into service for own use) |
| `build_supply` | provider |
| `deploy_vendor` | deployer |
| `put_name_on_or_substantially_modify` | deployer, **plus provider if status is high_risk** (Art. 25(1)(a)–(b)) |
| `repurpose_to_high_risk` | deployer, **plus provider if status is high_risk** (Art. 25(1)(c)) |
| `import_or_distribute` | importer_distributor (`eu.art_23`, `eu.art_24` if high-risk) |
| `gpai_model_provider` | gpai_provider (Art. 53). `eu.art_55` is always an open question (systemic-risk threshold). |
| `unsure` | provider + deployer, provisional, open question `role` |

Building an application on a third-party GPAI model through its API does **not** make you a GPAI model provider. Only a substantial modification of the model itself can, as described in the Commission GPAI guidelines.

## 4. Undetermined answers: conservative assumptions

| Field | Assumption when `unsure` | Blocking? |
|---|---|---|
| `prohibited.*` | Potentially prohibited: do not deploy until resolved | **yes** |
| `purpose` | High-risk (Annex III, basis unknown) | **yes** |
| `eu_nexus` | In scope | no |
| `annex_i_product` | High-risk via Annex I | no |
| `org_type` (only where it decides 5(a), FRIA or Art. 49(3)) | Condition met | no |
| `art_6_3.*` | Derogation not available | no |
| `role` | Provider and deployer | no |
| `severity` / `autonomy` / `reversible` | `material` / `human_oversight` / `no` (tier only) | no |

`blocking` open questions are shown above the results with a "resolve before go-live" label.

## 5. Obligation rules

The rules are summarised per key in `eu-obligations.json` (`applies`). The non-obvious ones are spelled out here:

- **Provider high-risk set:** `art_9, 10, 11, 12, 13, 14, 15, 16, 17, 43, 47, 72, 73`, plus `art_49_1` for Annex III except point 2.
- **Deployer high-risk set:** `art_26`. Add `art_26_7` if `affected` includes `staff`. Add `art_26_11` if the basis is Annex III (not point 2) and `affected` includes anyone other than staff.
- **FRIA, `art_27`:** deployer, Annex III but not point 2, and either `org_type` ∈ {public_authority, private_public_service} or basis ∈ {5(b), 5(c)}.
- **`art_49_3`:** deployer, Annex III but not point 2, and `org_type = public_authority`.
- **`art_86`:** deployer, Annex III but not point 2, and severity (after the tier's unsure defaults) ∈ {material, serious}.
- **`art_4`:** any in-scope provider or deployer, unless prohibited. As amended in 2026, this is an obligation to *support* AI literacy, not to guarantee a level of it.
- **SME and small mid-cap** (`org_size` ∈ {sme, small_mid_cap}): no obligations are removed. The output notes the simplified technical documentation (Art. 11), the proportionate QMS (Art. 17) and the penalty caps.
- **Dates:**
  - `effective_from: "basis"` resolves to 2 Dec 2027 (Annex III) or 2 Aug 2028 (Annex I).
  - Systems placed on the market before the relevant date are covered only if substantially modified afterwards. v2 does not ask about this yet *(future question; noted in the output)*.
  - Public-authority legacy systems have until 2 Aug 2030.

## 6. Governance tier

The tier is defined in `tier-matrix.json`. It is framework-neutral and answers "how much governance does this use case need?". It applies whether or not the EU AI Act does.

1. Apply unsure defaults (`severity=material`, `autonomy=human_oversight`, `reversible=no`).
2. Severity modifier: material and irreversible → serious.
3. Base tier = `matrix[severity][autonomy]`:

   | | human decides | human oversight | autonomous |
   |---|---|---|---|
   | negligible | 1 | 1 | 1 |
   | minor | 1 | 1 | 2 |
   | material | 2 | 2 | 3 |
   | serious | 3 | 3 | 4 |

4. Escalator: +1 if `affected` includes `vulnerable_or_children` (maximum 4).
5. Floors: EU `high_risk` (including provisional) ≥ 3; special-category, biometric or children's data ≥ 2.
6. `prohibited` → `P`.

Each tier's expectations are in `tier-matrix.json → tiers` and become concrete ISO/IEC 42001, 23894 and 42005 and NIST AI RMF requirements in Phase 3.

## 7. Golden suite

`src/v2/golden/scenarios.json` holds the executable form of this spec.

- `defaults` gives the base answers. Each scenario overrides top-level fields (a shallow merge).
- `expect` asserts `scope`, `status`, `provisional` and `tier`, plus `basis` and `roles` when present (they are omitted for out-of-scope scenarios). It also asserts `open_questions` (the gates that must appear), and `must_include` and `must_exclude` (obligation keys). Each scenario also lists `basis_refs`: the articles, recitals or guidelines that justify the expectation.
- Obligation assertions are **subsets**, not exhaustive lists, so adding an obligation later doesn't break unrelated scenarios.
- `scripts/tests/golden-v2.test.js` checks three things:
  - that every scenario is valid against the data files;
  - that each expected tier matches the tier rules above;
  - once `src/v2/engine/classify.js` exists, that the engine output matches.

**Adding a scenario:** cite the provision in `basis_refs`, keep the answers minimal, and prefer cases at the edge of a rule (carve-outs, exceptions, condition failures).

## 8. Verification register

These were checked against secondary sources on 2026-10-20 (law-firm and policy briefings on Reg. (EU) 2026/1744). Items marked **open** must be confirmed against the Official Journal text before v2 ships.

| Item | Status |
|---|---|
| Reg. (EU) 2026/1744 published OJ 24 Jul 2026, in force 27 Jul 2026 | Confirmed (multiple sources) |
| Annex III high-risk obligations from 2 Dec 2027; Annex I from 2 Aug 2028 | Confirmed |
| New Art. 5 prohibitions (NCII, CSAM) from 2 Dec 2026 | Confirmed. **Open:** paragraph lettering and exact wording |
| Art. 4 reframed as "support the development of AI literacy" | Confirmed (one source) |
| Art. 50(2) from 2 Dec 2026 | **Open:** whether this applies to all systems or only to those placed on the market before 2 Aug 2026 |
| Art. 49(2) registration of Art. 6(3) systems deleted | **Open:** in the Commission proposal; final text not confirmed |
| "Safety component" narrowed to health and safety functions; machinery moved to Annex I Section B | Confirmed (one source) |
| SME measures extended to small mid-caps (<750 staff, ≤€150m turnover or ≤€129m balance sheet) | Confirmed (one source) |
| Commission high-risk classification guidelines (Art. 6(5)) | Not yet published. The golden suite relies on the Act text, the recitals and the prohibited-practices guidelines (Feb 2025). |

## 9. Known gaps (deliberate for v2.0)

- No grandfathering question (whether the system was placed on the market before the application date).
- Annex I Section B is handled only as an open question.
- No GPAI systemic-risk threshold question.
- Art. 2 territorial nuance is collapsed into a single `eu_nexus` question.
- Country packs (GDPR, UK, AU) run after this pipeline and are out of scope for this spec.
