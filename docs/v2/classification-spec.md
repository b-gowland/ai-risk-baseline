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
| `scope_exclusion` ∈ military_defence_national_security, scientific_research_only, pre_market_research | `scope=out`, `status=out_of_scope`. Note: real-world testing is not covered by the pre-market exclusion. |
| `scope_exclusion = personal_non_professional` | Art. 2(10) removes only the obligations of **deployers** who are natural persons acting in a purely personal, non-professional capacity. It does not take the system out of scope. If `role` is only `deploy_vendor` → `scope=out`, `status=out_of_scope`. Otherwise continue in scope, and Step 6 drops the `deployer` role (provider and other duties remain). |
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
| *any, with `scope_exclusion = personal_non_professional`* | `deployer` is removed (Art. 2(10)); the other roles stay |

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
- Country packs (GDPR, UK, AU) run after this pipeline and never change the classification; see §11.

## 10. Requirements library

`src/v2/data/requirements.json` turns the classification and the tier into concrete requirements. `src/v2/engine/requirements.js` resolves it and `src/v2/engine/actions.js` picks the first five actions. `classify()` returns both as `requirements` and `actions`. Tests: `scripts/tests/requirements-v2.test.js`.

### 10.1 Shape

```text
Requirement = {
  id, title, summary,
  level:   org | use_case,
  gate:    classify | design | build | pre_deploy | operate,
  sources: [{ framework, ref, url? }],   // framework: eu_ai_act | iso_42001 | iso_23894 | iso_42005 | nist_ai_rmf | nist_ai_600_1
  artefact,                               // what "done" looks like
  owners:  [risk | legal | tech | procurement],
  effort:  Low | Medium | High,
  effective_from: YYYY-MM-DD | null,      // earliest date of the EU obligations it cites; null if none
  why,                                    // the conditions that made it apply
  existing?: true                         // org items only, see 10.3
}
actions = [{ rank, requirement_id, title, why }]   // at most 5
```

One requirement can satisfy several frameworks, so it is listed once. For example, `uc.risk_assessment` is the tier-2 risk assessment (ISO/IEC 23894 cl. 6.3–6.5 and 6.7, ISO/IEC 42001 cl. 6.1.2–6.1.3 and 8.2–8.3, NIST MAP 5.1, MANAGE 1.2–1.3) and, when the engine lists `eu.art_9`, also the Art. 9 risk management system.

### 10.2 When a requirement applies

`applies` is a typed predicate over the classification result:

| Leaf | Matches when |
|---|---|
| `always: true` | always |
| `status: [...]` | `result.status` is one of the values |
| `obligation: [eu.*]` | `result.obligations` lists any of the keys |
| `tier_min: n` | `result.tier` is a number ≥ n (never for tier `P`) |
| `role: [...]` / `tech: [...]` | the answer intersects the values |

`all` and `any` combine leaves. The leaves that matched become the requirement's `why`.

**EU sources follow the engine.** An EU source with an `obligation` key is shown only when `classify()` lists that obligation; one marked `in_scope` only when the status is not `out_of_scope`. So a merged requirement cites the EU article only where the Act applies to this user in this role. When at least one EU obligation source is shown, the requirement's `eu_variant` (title, summary, artefact, effort) replaces the framework-neutral wording, e.g. "AI system impact assessment" becomes "Fundamental rights impact assessment (EU Art. 27)".

**Every EU obligation key maps to exactly one requirement:**

| Requirement | EU obligation keys | Also applies |
|---|---|---|
| `uc.prohibited_stop` | `art_5_1*` | status `prohibited` |
| `uc.classification_record` | (Arts. 2, 3, 6, 25 cited) | always |
| `org.ai_literacy` | `art_4` | tier ≥ 1 |
| `uc.art_6_3_record` | `art_6_4`, `art_49_2` | |
| `uc.risk_assessment` | `art_9` | tier ≥ 2 |
| `uc.impact_assessment` | `art_27` | tier ≥ 3 |
| `org.aims` | `art_17` | tier ≥ 3 |
| `uc.human_oversight` | `art_14` | tier ≥ 3 |
| `uc.data_governance` | `art_10` | tier ≥ 3 and a building role |
| `uc.testing` | `art_15` | tier ≥ 3 |
| `uc.logging` | `art_12` | tier ≥ 3 |
| `uc.technical_documentation` | `art_11`, `art_13` | |
| `uc.transparency` | `art_50_1`, `art_50_3`, `art_50_4`, `art_26_7`, `art_26_11`, `art_86` | tier ≥ 2 |
| `uc.content_marking` | `art_50_2` | |
| `uc.gpai_model` | `art_53`, `art_55` | |
| `uc.importer_distributor` | `art_23`, `art_24` | |
| `uc.deployer_duties` | `art_26` | |
| `uc.conformity` | `art_16`, `art_43`, `art_47` | |
| `uc.eu_registration` | `art_49_1`, `art_49_3` | |
| `uc.monitoring` | `art_72` | tier ≥ 2 |
| `uc.incident_process` | `art_73` | tier ≥ 3 |

**Tier core.** These apply whether or not the EU AI Act does, following `tier-matrix.json → tiers.expects`:

- Tier 1: `org.ai_inventory`, `uc.owner` (named owner and acceptable-use check), `org.ai_policy`, `org.ai_literacy`.
- Tier 2 adds: `uc.risk_assessment` (ISO/IEC 23894 process), `uc.transparency`, `uc.vendor_due_diligence` (only where a vendor system or third-party model is used), `uc.monitoring`.
- Tier 3 adds: `uc.impact_assessment` (ISO/IEC 42005-style), `uc.human_oversight`, `uc.testing`, `uc.logging`, `uc.incident_process`, `uc.go_live_approval`, `org.aims`, and `uc.data_governance` when the user builds the system.
- Tier 4 adds: `uc.independent_review`, `uc.exec_accountability`, `uc.continuous_monitoring` (thresholds, kill-switch, re-assessment at least every 12 months).
- `uc.genai_overlay` (NIST AI 600-1, 12 GAI risks) applies at any tier when `tech` includes `llm_genai`.
- `uc.classification_record` always applies, so the list is never empty. A `prohibited` result gets only `uc.prohibited_stop` and `uc.classification_record`.

### 10.3 Organisation-level items

`org.ai_policy`, `org.ai_inventory`, `org.ai_literacy` and `org.aims` are `level: "org"`: done once for the organisation, not per system. When `ai_policy_inventory = yes`, `org.ai_policy` and `org.ai_inventory` are kept with `existing: true` and a `why` starting "Existing: confirm it covers this use case". When it is `unsure`, the `why` starts "Check whether this already exists". The answer says nothing about literacy measures or a management system, so those two are never marked existing.

### 10.4 First 5 actions

Ordered by gate and dependency, never by effort. One slot per stage, each filled by the first applicable requirement in its preference list:

1. **Classify:** `uc.classification_record`. If any open question is blocking, the action is "Resolve the blocking open questions and record the classification" and the `why` lists them with their assumptions.
2. **Inventory:** `org.ai_inventory`.
3. **Assess:** `uc.impact_assessment`, else `uc.risk_assessment`, else `uc.owner`.
4. **Blocks go-live:** `uc.conformity`, `uc.art_6_3_record`, `uc.gpai_model`, `uc.importer_distributor`, `uc.deployer_duties`, `uc.go_live_approval`, `uc.content_marking`, `uc.transparency`, `uc.vendor_due_diligence`, `org.ai_literacy`.
5. **Operate:** `uc.incident_process`, else `uc.monitoring`, else `org.ai_literacy`.

The picks are then stably sorted by gate, so the list never goes backwards in the lifecycle. For a `prohibited` result there are two actions: stop and escalate (`uc.prohibited_stop`), then record the finding.

### 10.5 Sources and verification

Each framework in `requirements.json → frameworks` has a URL, a `last_verified` date and a source note.

| Framework | Checked on 2026-10-20 |
|---|---|
| EU AI Act | Article references as in §8. |
| NIST AI RMF 1.0 (AI 100-1) | All 72 subcategory ids checked against the PDF from nvlpubs.nist.gov; the test suite rejects any other id. |
| NIST AI 600-1 | The 12 risk names checked against Section 2 of the PDF (note: "Harmful Bias **or** Homogenization"). |
| ISO/IEC 42001, 23894, 42005 | The texts are paywalled and not reproduced: refs are clause and control numbers and titles, with our own paraphrase. On 2026-10-20 every ref was verified against NIST's official crosswalks on the AI Resource Center: [AI RMF to ISO/IEC 42001](https://airc.nist.gov/docs/NIST_AI_RMF_to_ISO_IEC_42001_Crosswalk.pdf) (FDIS; its Annex B mirrors Annex A numbering), [ISO/IEC 23894, revised](https://airc.nist.gov/documents/3/ai-2025-00109_revised_ISO_IEC_23894_Crosswalk_to_the_NIST_AI_RMF.pdf), and [ISO/IEC 42005](https://airc.nist.gov/documents/2/ai-2025-00108_ISO_IEC_42005_to_NIST_AI_RMF_Crosswalk.pdf) (DIS, so only top-level clauses 5 and 6 are cited). The 38 Annex A controls of 42001 were cross-checked against an independent listing of the published 2023 edition. The verified titles live in `requirements.json → frameworks.*.ref_titles`, and `npm run validate` rejects any ISO ref without one. |

## 11. Country packs

Country packs add data protection and national AI guidance on top of the core frameworks. Each pack lives in `src/v2/packs/<id>.json` and uses the requirement schema of §10. It is resolved after the core library, and every resulting requirement carries `pack: "<id>"`. Packs never change the EU AI Act classification, the tier or the first five actions, and they add nothing when the status is `prohibited`.

### 11.1 When a pack applies

| Pack | Applies when | Covers |
|---|---|---|
| `gdpr` | `eu_nexus` is `yes` or `unsure`, and personal data is processed | Regulation (EU) 2016/679: Arts. 5, 6, 8, 9, 13, 14, 22, 25, 28, 30, 32–36, 44, 46 |
| `uk` | `other_jurisdictions` includes `uk`, and personal data is processed | UK GDPR and DPA 2018 as amended by the Data (Use and Access) Act 2025 (Arts. 22A–22D from 5 Feb 2026), ICO guidance |
| `au` | `other_jurisdictions` includes `au` (the privacy items also need personal data) | Privacy Act 1988 and the APPs, including APP 1.7–1.9 from 10 Dec 2026; OAIC AI guidance; Guidance for AI Adoption |

`other_jurisdictions = other` adds no pack; the output says those jurisdictions are not covered.

### 11.2 Answer-based predicate leaves

Packs use these leaves in addition to those in §10.2:

| Leaf | Matches when |
|---|---|
| `jurisdiction: [eu, uk, au]` | `eu`: `eu_nexus` is `yes` or `unsure`; `uk`/`au`: listed in `other_jurisdictions` |
| `data: [...]` | `data` includes any of the values |
| `personal_data: true` | `data` includes personal, special-category, biometric or children's data, and `scope_exclusion` is not `personal_non_professional` or `military_defence_national_security` (data protection law does not reach those, GDPR Art. 2(2)) |
| `significant_decision: true` | severity (after the tier's unsure default) is `material` or `serious`, and someone is affected |
| `significant_automated: true` | `significant_decision`, and `autonomy` is not `human_decides`: sample review or override is not meaningful human involvement in each decision (UK GDPR Art. 22A(1)(a); GDPR Art. 22 "solely") |

AU APP 1.7 uses `significant_decision`, not `significant_automated`, because it reaches programs that do something "substantially and directly related to" making a decision, i.e. decision support.

### 11.3 Verification

| Pack | Primary sources checked on 2026-10-20 |
|---|---|
| GDPR | EUR-Lex text of Regulation (EU) 2016/679: the articles listed in 11.1 (Art. 22(1)–(4), 35(3), 8(1), 9(1), 13(2)(f) checked verbatim). |
| UK | legislation.gov.uk: Data (Use and Access) Act 2025 s.80 (Arts. 22A–22D text); SI 2026/82 reg. 2 (ss.70, 80, 81, 85 in force 5 Feb 2026) and reg. 5 (decisions before then keep the old Art. 22 safeguards). ICO AI guidance: DPIA expectation, and note that the guidance is under review after the Act. |
| AU | legislation.gov.au: Privacy and Other Legislation Amendment Act 2024 (No. 128), commencement table item 7 (Schedule 1 Part 15 from 10 Dec 2026), items 87–89 (APP 1.7–1.9 text, s 13K infringement notices, application to later decisions). OAIC: small business threshold (A$3 million) and AI product guidance. ai.gov.au: the six essential practices. |

Pack tests are in `scripts/tests/packs-v2.test.js`.
