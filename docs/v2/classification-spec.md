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
- For prohibitions with a future `effective_from` (points (ba) and (bb), from 2 Dec 2026), the classification still says prohibited, and the date is shown alongside it.
- For points (ba) and (bb), the provider and deployer tests differ (Art. 5(1a)):
  - A provider is caught if the prohibited output is the intended purpose, or if it is a reasonably foreseeable and reproducible outcome the system lacks adequate safeguards to prevent.
  - A deployer is caught only if they use the system for that purpose.
  - The screen question states both tests.

### Step 2: Annex I product route (Art. 6(1))

This step only runs when the `annex_i_product` question is shown.

- `yes` → `status=high_risk`, `basis=annex_i`. Obligation dates come from `dates.annex_i` (2 Aug 2028).
- `unsure` → open question. Assumption: **high-risk via Annex I** (provisional), because the purposes that trigger this question are medical and safety ones.
- What counts as a "safety component" (Art. 3(14) and Art. 6(1a)–(1c), as amended):
  - A safety component is one whose intended purpose is to prevent or mitigate risks to health and safety.
  - Systems used *solely* for non-safety assistance, optimisation, efficiency, automation, convenience or quality control are not safety components, unless their failure would endanger health and safety.
  - A third-party conformity assessment that is required only for non-health-and-safety risks (e.g. radio spectrum) doesn't meet Art. 6(1)(b).
  - The `annex_i_product` help text must say all of this.
- Annex I Section B products (vehicles, aviation, marine, rail and, since 2026, machinery) apply AI Act obligations only through their sectoral acts. Under Art. 2(2) as amended, only Art. 6(1), Art. 60a and Arts. 102–112 apply directly. v2 treats Section B as an open question, not as high-risk. *(Future question.)*
- Art. 2(13) (new) lets delegated acts limit some Art. 9–15 and 17–25 obligations where Annex I Section A legislation already gives equivalent protection. The output should note this for Annex I systems.

### Step 3: Annex III (Art. 6(2))

- If the purpose has an `annex_iii` reference and its `annex_iii_condition` (if any) matches → candidate `high_risk`, `basis=annex_iii.<ref>`.
- Conditions in the catalogue: 5(a), 6 and 7 require `org_type = public_authority`. That answer includes bodies acting on a public authority's behalf, which is how the Annex III wording reads ("by or on behalf of").
- If the condition answer is `unsure` → candidate `high_risk`, provisional, open question `annex_iii_condition`.
- If `purpose = unsure` → candidate `high_risk`, `basis=null`, provisional, open question `purpose`, `blocking: true`.
- If Step 2 already set `annex_i` and an Annex III purpose also matches, keep both bases. Annex I governs the dates.

### Step 4: Art. 6(3) derogation

This step only runs for an Annex III candidate.

| `art_6_3` answers | Result |
|---|---|
| `profiling = yes` | `high_risk`. The derogation is unavailable; record that in the trace. |
| `profiling = no` and any condition `yes` | `status=not_high_risk_6_3`. Provider obligations `eu.art_6_4` (document the assessment) and `eu.art_49_2` (register; retained in 2026, with lighter Annex VIII Section B content). |
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

The output carries these exceptions as notes. They are not asked as questions:
- Art. 50(2) does not apply to assistive editing that does not substantially alter the input.
- Under Art. 50(4), evidently artistic, creative, satirical or fictional works only need an unobtrusive disclosure.
- Uses authorised by law for criminal-offence purposes are exempt.

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

When Art. 25(1) makes someone the new provider, Art. 25(2) as amended says the initial provider is no longer the provider of that system. It must still cooperate: it hands over technical documentation, tells the new provider about known limitations and failure modes, and gives targeted technical access for testing. This duty doesn't apply where the initial provider clearly specified that the system must not be turned into a high-risk system. In that case the trace tells the user to check the vendor terms.

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
- **Deployer high-risk set:** `art_26`. Add `art_26_7` if `affected` includes `staff`. Add `art_26_11` if the basis is Annex III and the system makes or assists decisions related to natural persons, workers included. v2 approximates this as "not point 2" (critical-infrastructure safety components don't decide about people), applied whoever is affected.
- **FRIA, `art_27`:** deployer, Annex III but not point 2, and either `org_type` ∈ {public_authority, private_public_service} or basis ∈ {5(b), 5(c)}. Since 2026, the FRIA may cross-refer to a GDPR Art. 35 DPIA (Art. 27(4)), and the AI Office is to publish a questionnaire template (Art. 27(5)).
- **Special-category data for bias work (Art. 4a, new):** this is a permission, not an obligation, and it replaces the deleted Art. 10(5). Providers of high-risk systems may process special-category data where strictly necessary for bias detection and correction, under conditions (a)–(f). Other providers and deployers may do so on the same conditions. The output notes it when `data` includes `special_category` and status is `high_risk`.
- **`art_49_3`:** deployer, Annex III but not point 2, and `org_type = public_authority`.
- **`art_86`:** deployer, Annex III but not point 2, and severity (after the tier's unsure defaults) ∈ {material, serious}.
- **`art_4`:** any in-scope provider or deployer, unless prohibited. As amended in 2026, this is an obligation to *support* AI literacy, not to guarantee a level of it.
- **SME and small mid-cap** (`org_size` ∈ {sme, small_mid_cap}): no obligations are removed. The output notes the simplified technical documentation (Art. 11), the proportionate QMS (Art. 17) and the penalty caps.
- **Dates:**
  - `effective_from: "basis"` resolves to 2 Dec 2027 (Annex III) or 2 Aug 2028 (Annex I).
    - Strictly, Art. 113(c) as amended dates only Chapter III Sections 1–3 (Arts. 6–27), and the rest of the Act applies from 2 Aug 2026.
    - But no system is high-risk until Art. 6 applies, so Arts. 43, 47–49, 72, 73 and 86 bite on the same dates in practice. v2 shows the basis date for all of them.
  - Art. 50: from 2 Aug 2026. Under Art. 111(4), Art. 50(2) is postponed to 2 Dec 2026 only for systems placed on the market before 2 Aug 2026.
  - Under Art. 111(2) as amended, high-risk systems placed on the market before the application date are covered only if their design changes significantly afterwards. v2 does not ask about this yet *(future question; noted in the output)*.
  - High-risk systems intended for use by public authorities must comply by 2 Aug 2030 regardless (Art. 111(2)).

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

**Verified on 2026-10-20 against the primary texts on EUR-Lex:**
- Regulation (EU) 2024/1689, OJ L 12.7.2024.
- Regulation (EU) 2026/1744, OJ L 24.7.2026 (signed 8 July 2026; Art. 4: in force the third day after publication, i.e. 27 July 2026).

Article references below are to 2024/1689 as amended. "2026/1744 pt (n)" is point (n) of Article 1 of the amending regulation.

| Item | Primary-text finding |
|---|---|
| Annex III dates | Art. 113(c)(i): Chapter III Sections 1–3 apply from **2 Dec 2027** for Art. 6(2)/Annex III (2026/1744 pt 40) |
| Annex I dates | Art. 113(c)(ii): Chapter III Sections 1–3 apply from **2 Aug 2028** for Art. 6(1)/Annex I (2026/1744 pt 40) |
| New prohibitions | **Art. 5(1)(ba)** (non-consensual intimate imagery) and **(bb)** (CSAM, subject to a national "without right" defence). Art. 5(1a) splits the provider and deployer tests; Art. 5(1b) defines what is not manipulation. All apply from **2 Dec 2026** (Art. 113(a)) (2026/1744 pts 7, 40) |
| Art. 4 AI literacy | Replaced: providers and deployers "take measures to support the development of AI literacy", with no guaranteed level. The Commission and Member States support this, and the Board adopts recommendations (2026/1744 pt 5) |
| Art. 50 dates | Art. 50 is **not** amended apart from para. 7 (codes of practice). It applies from **2 Aug 2026** (original Art. 113). New **Art. 111(4)**: Art. 50(2) applies from **2 Dec 2026** only to systems placed on the market before 2 Aug 2026 (2026/1744 pts 20, 39) |
| Art. 49(2) registration of Art. 6(3) systems | **Retained.** Art. 49 is not amended, and Art. 6(4) still refers to it. Only Annex VIII Section B **points 7 and 9** are deleted (2026/1744 pt 42) |
| Safety component | Art. 3(14) redefined. New Art. 6(1a)–(1c) (2026/1744 pts 4, 8) |
| Machinery | Removed from Annex I Section A (point 1) and added to Section B (point 21) (2026/1744 pt 41) |
| Annex I Section B | Art. 2(2): only Art. 6(1), 60a and 102–112 apply (2026/1744 pt 2) |
| SME / small mid-cap | SME and SMC defined in Art. 3(14a)–(14b), the latter by reference to Recommendation (EU) 2025/1099. Simplified technical documentation (Art. 11(1)), proportionate QMS (Art. 17(2)) and penalties (Art. 99(1), (6a)) (2026/1744 pts 4, 10, 11, 38) |
| Bias data | New Art. 4a; Art. 10(5) deleted (2026/1744 pts 6, 9) |
| FRIA | Art. 27(4)–(5): DPIA cross-reference and AI Office template (2026/1744 pt 13) |
| Value chain | Art. 25(2) and (4) rewritten: duties of the initial provider and of third-party suppliers (2026/1744 pt 12) |
| Legacy systems | Art. 111(2): covered only on "significant changes in their designs"; public-authority systems by **2 Aug 2030** (2026/1744 pt 39) |
| Unchanged provisions the spec relies on | Original OJ text checked: Art. 2(12), 5(1)(f), 6(3)–(4), 25(1), 26(7), 26(11), 27(1), 49(1)–(5), 50(1)–(4), 86(1), Annex III |
| Commission high-risk classification guidelines (Art. 6(5)) | Not yet published, so the golden suite relies on the Act text, the recitals and the prohibited-practices guidelines (Feb 2025) |

The secondary sources consulted earlier were wrong or imprecise on two points: Art. 50(2) is not postponed for new systems, and the Art. 49(2) deletion proposed by the Commission did not survive into the final text.

## 9. Known gaps (deliberate for v2.0)

- No grandfathering question (whether the system was placed on the market before the application date).
- Annex I Section B is handled only as an open question.
- No GPAI systemic-risk threshold question.
- Art. 2 territorial nuance is collapsed into a single `eu_nexus` question.
- Country packs (GDPR, UK, AU) run after this pipeline and are out of scope for this spec.
