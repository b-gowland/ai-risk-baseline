# AI Governance Baseline — first-principles review and rebuild plan

**Date:** 2026-10-20 · **Scope:** whole repo (premise, question model, rules engine, content, UX, tooling)
**Constraint applied:** core frameworks only — EU AI Act, ISO/IEC AI standards, NIST AI RMF. Nothing existing is assumed to be required.

---

## 1. Verdict

The infrastructure around the tool is good. The core model is not.

The tool asks about *technology* (system type, domain, platform) and derives obligations from combinations of those. The EU AI Act, ISO/IEC 42001/23894 and NIST AI RMF all start from **intended purpose, role and impact**, not technology. That mismatch is what causes most of the wrong answers below, and fixing it means changing the primitive rather than patching mappings.

Running the current engine against ten realistic scenarios gave a materially wrong or misleading EU AI Act result in **nine** of them. In four of those (a prohibited practice and three high-risk systems), the tool misses the classification entirely.

**Recommendation:** keep the shell (client-side, URL state, data-as-content, source notes, date and URL checks, export). Rebuild the question set, the classification logic, the requirements library and the risk model from scratch around a purpose → role → impact → requirements chain, with a legal golden-test suite written *before* the content.

---

## 2. First principles: what this tool has to do

**User:** an AI governance lead, from a one-person function at a 50-person company up to a central AI risk team at a multinational. They are usually not lawyers and often not engineers.

**Job to be done:** *"Someone has brought me an AI use case. In about 10 minutes, tell me (1) whether it's allowed, (2) how seriously I need to govern it, (3) which requirements apply and why, (4) what the main risks are, and (5) what to do first. Also tell me what you couldn't work out, so I know what to escalate."*

From that, five design principles follow:

| # | Principle | Consequence |
|---|---|---|
| P1 | **Classify by purpose, not technology.** | The Annex III and Art. 5 screens are driven by what the system *is used for*. An LLM that scores credit is still Annex III §5(b). Technology tags only drive *technical* risk considerations. |
| P2 | **Role determines obligations.** | Provider, deployer, importer/distributor, GPAI model provider, and the Art. 25 "becomes a provider" triggers each carry different EU AI Act duties. Role must be a first-class answer, not an optional sub-question. |
| P3 | **Proportionality is the output small orgs need most.** | A tier (how much governance this use case needs) matters more to a small org than a 26-control list. ISO 42001 cl. 6.1, ISO/IEC 23894 and NIST MAP all expect risk-based scaling. |
| P4 | **Every conclusion must be traceable and must be able to say "I don't know".** | Each result shows the answers that triggered it. Unknown or borderline answers produce *"needs determination"* items, never silence. |
| P5 | **Org-level and system-level are different things.** | ISO 42001 is a management system for the organisation, and NIST GOVERN is organisational. Neither is a per-system obligation. The tool should separate "your programme needs X" (done once) from "this use case needs Y" (done per system). |

---

## 3. What's wrong today, with evidence

### 3.1 Scenario probe (engine run on 2026-10-20 with current data)

| Scenario | What the tool says | What it should say |
|---|---|---|
| Emotion recognition of employees (EU, vendor tool) | Annex III §4 + Art. 50 transparency | **Prohibited**: Art. 5(1)(f), emotion recognition in the workplace. No prohibition screen exists for biometrics. |
| Facial identification of retail customers (EU) | Art. 4, Art. 50, GDPR Art. 22. No high-risk result. | **High-risk**: Annex III §1(a), remote biometric identification. Art. 5(1)(h) needs to be screened out explicitly. |
| Exam scoring for students (EU) | Art. 9 only (via a broken predicate) | **High-risk**: Annex III §3 (education). Education is a selectable domain, but nothing in Annex III §3 is mapped. |
| Fraud detection (EU, financial services) | **Annex III §5(b) high-risk**, full Art. 9–15, FRIA, Art. 86 | **Not high-risk under 5(b)**: fraud detection is explicitly carved out. The tool can't tell credit scoring from fraud because it only knows "predictive + financial services". |
| LLM used for credit scoring (EU) | No high-risk result | **High-risk**: Annex III §5(b). The classification is lost because `system_type=llm_chatbot`. |
| Agentic CV screening, automated (EU) | Annex III §4, but no Art. 9–15 / 26. GPAI Arts. 53–55 listed. | **High-risk**: full provider/deployer obligations. GPAI model duties don't apply to the deployer. |
| Vendor customer-service chatbot (EU deployer) | GPAI Arts. 53–55 listed as **mandatory** | Art. 50(1) is the *provider's* duty. The deployer has Art. 4 and limited Art. 50 duties. The GPAI item's own summary says it generally doesn't apply, yet it is still shown as a mandatory obligation. |
| Internal HR copilot drafting job ads, no personal data (EU) | **Annex III §4 high-risk** | Probably not high-risk. §4 covers recruitment/selection, decisions on terms, task allocation and monitoring. Drafting ads is at most borderline, and Art. 6(3) applies. The tool flags all HR-domain systems. |
| "Don't know" on everything | 0 regulatory items, 2 controls | The UI promises "broadest applicable output". Missing answers make every predicate fail, so the result is nearly empty. This is the riskiest possible failure for a screening tool. |
| US credit scoring | NIST GOVERN + ISO 42001 | Reasonable for scope. |

### 3.2 Structural problems

**A. Question model (`src/data/system-config.json`)**
- `system_type` mixes technology (LLM, agentic, generative), purpose (biometric ID) and decision mode (automated_decision), so one answer has to carry three meanings. `automated_decision` and biometrics each appear twice in the schema under different questions.
- There's no Art. 5 prohibited-practice screen, which is the first legal question a governance lead needs answered.
- There's no Annex III use-case question, so domain stands in for it and is both over- and under-inclusive (see probes).
- There's no Art. 6(3) derogation, no Annex I product-safety question, and no EU-nexus question beyond "jurisdiction".
- Role (`build_path`) is optional, and "combination → both obligation sets" is too coarse. The Art. 25 triggers (own name/trademark, substantial modification, change of intended purpose) are what matter.
- There are no impact-severity, reversibility or scale-of-effect questions beyond a data-volume band.
- There are no org questions (size or maturity), so output can't scale from small to enterprise.
- `platform` has no bearing on risk or obligations, and its "Phase 2" feature never shipped.

**B. Framework coverage against the stated core**
- **EU AI Act:** Art. 5 is missing apart from one 2026 addition. Annex III §§1, 2, 3, 5(a), 5(c), 5(d), 6, 7 and 8 are unmapped. Art. 6(3), Arts. 11, 12, 16–17 (QMS), 43, 47–49 (registration), 72 (post-market monitoring) and 73 (serious incidents) are missing or only hinted at in control text. Provider vs deployer duties aren't separated. `eu_ai_act_annex_iii_5a` is actually an Annex I medical-device mapping (the real Annex III 5(a) is public benefits), and it fires for any healthcare system without asking whether it is a regulated device.
- **ISO:** ISO/IEC 42001 is one undifferentiated blob that fires on four system types and never on generative or biometric ones. ISO/IEC 23894 (AI risk management), 42005 (AI system impact assessment), 22989 (concepts/terminology), 5338 (lifecycle) and 24027 (bias) are missing. 42001 Annex A controls are never used as the control vocabulary, although they are the obvious one.
- **NIST AI RMF:** only GOVERN is mapped, and only when decision mode is automated or decision-support. MAP, MEASURE and MANAGE are absent, as are the seven trustworthiness characteristics and the Generative AI Profile (NIST AI 600-1).

**C. Scope creep against the stated core.** GDPR, UK DUAA/ICO, AU Privacy Act, APRA CPS 230, AU Guidance for AI Adoption and OWASP make up 11 of 27 mappings. They are useful, but they dilute the core, multiply maintenance and are hard-coded into the action scorer (`baseline.js:248`).

**D. Risk model (`risks-mappings.json`, `predicate.js:scoreRisk`)**
- Risks are additive weights over 32 entries from the AI Risk Practice library, sorted and cut to the top 7. A score of 150 has no meaning, there's no likelihood × impact, and anything ranked 8th or lower is silently hidden.
- The risk catalogue is the house knowledge base, not a framework-aligned taxonomy, so the risks can't be traced to NIST characteristics, ISO 23894 or EU AI Act Art. 9.
- There's no inherent risk tier, which is the most useful single output.

**E. Controls and actions (`controls-index.json`, `baseline.js:buildActions`)**
- "High-effort first" is the wrong ordering for a starting point. Sequencing should follow gates and dependencies: prohibited check → classification → inventory → impact assessment → design controls → pre-deployment → monitoring.
- `hasMandatory` matches framework id substrings (`eu_ai_act`, `apra`, `au_privacy`), and `hasUpcomingDeadline` does string surgery on ids. Both are fragile and partly wrong.
- Org-level controls (literacy, AIMS, risk register, policy) and system-level controls are mixed together.
- Controls describe activities but not the **artefact/evidence** each one produces, which is what an auditor or a 42001 certification body asks for.

**F. Engine and data integrity**
- Predicate values that don't exist in the question schema (`generative`, `recommendation`, `scoring`, `multimodal`, `other` in `eu_ai_act_art_9`) silently never match. `npm run validate` doesn't catch this.
- The dangling reference `c_agentic_audit_log → eu_ai_act_art_12` points to a mapping that doesn't exist.
- `predicate.js:83` returns `true` for any field starting with `"id"`.
- Missing answers evaluate to `false` everywhere, which causes the "Don't know" failure above.
- `groupControlsByFunction` doesn't add multi-owner controls to every owner, despite its comment. `MANDATORY_FRAMEWORK_IDS` is dead code.
- Engine tests check presence and counts. Apart from one AU case, they never assert that something is *excluded* or that a classification is correct, so all the probe failures pass CI.

**G. Things I could not verify.** The repo states that the Digital Omnibus on AI was adopted as Regulation (EU) 2026/1744 (moving Annex III to 2 Dec 2027 and Annex I to 2 Aug 2028) and that new Art. 5(1)(ba)–(bb) prohibitions were added. Both are after my knowledge cut-off, so confirm them against EUR-Lex before reusing them in the rebuild.

### 3.3 What's worth keeping

- No backend, no login, client-side compute, shareable URL state. This is the right privacy posture for sensitive use-case details.
- Data-as-content with `source_url`, `_source_note` and `last_verified` per item.
- Date-aware obligations, plus the date-crossing and URL-health CI workflows.
- CC BY content licence, Markdown export and the disclaimer framing.
- The React/Vite stack, which is fine. Nothing here needs a framework change.

---

## 4. Target design

### 4.1 Two layers

1. **Organisation profile** (optional, about 4 questions, stored in the URL and reusable): org size (SME/micro relief under the AI Act), whether an AI policy/inventory/AIMS exists, ISO 27001/27701 status, and the governance owner. This produces the **programme baseline**: Art. 4 literacy, AI policy, inventory, ISO 42001 cl. 4–10 essentials and NIST GOVERN, scaled to size.
2. **Use-case profile** (per system, about 10–12 adaptive questions). This produces the **use-case baseline**.

### 4.2 Minimal adaptive question set (use case)

Ordered as legal gates. Later questions appear only when earlier answers make them relevant. Every question has an "Unsure" option that produces a *needs determination* item.

| # | Question | Drives |
|---|---|---|
| 1 | **Intended purpose.** Pick from a purpose catalogue (each Annex III point in plain language, plus common non-high-risk purposes such as "internal productivity", "customer service Q&A", "content generation", "fraud detection", "forecasting"), plus a free-text name. | Annex III mapping; carve-outs such as fraud |
| 2 | **Prohibited-practice screen.** Shown only for relevant purposes or technologies. About 8 yes/no items, one per Art. 5(1) point, in plain language. | **Stop**: prohibited |
| 3 | EU nexus: placed on the EU market, put into service in the EU, or output used in the EU | AI Act in/out of scope |
| 4 | **Role:** build it / put a vendor system into use / rebrand or substantially modify a vendor system / provide a general-purpose model | Provider vs deployer duties, Art. 25, GPAI |
| 5 | Safety component of a regulated product (medical device, machinery, vehicle…)? | Annex I route |
| 6 | Art. 6(3) screen (shown only if Annex III matched): narrow procedural task / improves a completed human activity / detects patterns without replacing human assessment / preparatory task. Profiling of natural persons overrides. | High-risk or documented exemption |
| 7 | Does it interact directly with people, or generate or alter content (text, image, audio, video, deepfakes)? Emotion recognition or biometric categorisation? | Art. 50 duties by role |
| 8 | **Autonomy:** human decides each case / human reviews samples or can override / acts autonomously, including using tools | Tier, oversight requirements, agentic risks |
| 9 | **Impact:** worst plausible harm to a person (none / inconvenience / financial or access-to-service / legal, health, safety or fundamental rights) and whether it is reversible | Tier |
| 10 | Who is affected, and how many: staff / customers / public / vulnerable groups or children | Tier, FRIA trigger |
| 11 | Data: none / personal / special category or biometric / children | Tier, data-governance requirements |
| 12 | **Technology tags** (multi): classical ML, LLM/GenAI, agent with tool use, computer vision/biometrics, third-party model or API | Technical risk considerations and NIST AI 600-1 overlay only, **never** legal classification |
| 13 | Lifecycle stage: idea / building / pre-deployment / live | Sequencing of actions |

### 4.3 Outputs, in order of usefulness

1. **Classification card.** EU AI Act status (*Prohibited / High-risk (Annex III point x or Annex I) / Exempt under 6(3), document it / Transparency obligations only / Minimal / Out of scope / Needs determination*), your role, and the key dates. Each status shows a **"because"** trace listing the answers that produced it.
2. **Governance tier (1–4).** Framework-neutral and computed from impact × autonomy × exposure × data sensitivity, with EU high-risk as a floor. This sets how much governance applies: tier 1 gets an inventory entry plus an acceptable-use check, tier 4 gets the full set.
3. **Requirements.** Grouped by lifecycle gate. Each item shows its source clause, why it applies, your role, when it applies, the **artefact it produces**, and crosswalk ids (EU article ↔ ISO 42001 Annex A ↔ NIST subcategory). One requirement can satisfy several frameworks, so it is listed once.
4. **Risk considerations.** Organised by the seven NIST trustworthiness characteristics, plus the 12 NIST AI 600-1 GenAI risks when GenAI is tagged. Each has a one-line reason it applies. All are shown, grouped by relevance (high/medium), with no hidden top-7 cut-off.
5. **First 5 actions.** Dependency-ordered by gate, not by effort. Typically: confirm the prohibited screen and log the classification → inventory entry → impact assessment (ISO/IEC 42005-style) → the requirement that blocks go-live → monitoring and incident setup.
6. **Open questions to escalate.** Every "Unsure" answer and every borderline rule, phrased as a question for Legal, the vendor or Tech.
7. **Exports:** Markdown, plus versioned JSON and CSV for import into GRC tools. The URL stays the save format.

### 4.4 Content model

A single **requirements library** replaces `regulatory-mappings` + `controls-index` + `actions-template`:

```text
requirement {
  id, title, plain_summary,
  source: { framework, clause, url, last_verified, source_note },
  level: org | use_case,
  applies: { classification[], roles[], min_tier, conditions },   // typed, validated
  effective_from, effective_until,
  gate: classify | design | build | pre_deploy | operate,
  artefact: "e.g. Technical documentation per Annex IV",
  crosswalk: { iso42001: ["A.6.2.4"], nist: ["MEASURE 2.11"], eu: ["Art. 15"] },
  owners[], effort
}
```

- **Classification is code, not weighted data.** It is a small, explicit decision function (Art. 5 → Annex I → Annex III → 6(3) → Art. 50 → minimal) that emits a trace. Purpose-catalogue entries carry their Annex III references and carve-outs as data.
- **Risk taxonomy:** NIST characteristics + AI 600-1 as the spine. AI Risk Practice library entries become optional "learn more" links, not the scoring basis.
- **ISO text is paywalled.** Reference clause and control numbers and titles with original paraphrase only. Don't reproduce Annex A text.
- **Schema enforcement:** JSON Schema (or zod) generated from the question schema, so any predicate value or reference that doesn't exist fails `npm run validate`.

### 4.5 Keep / change / drop

| Keep | Change | Drop or move out of core |
|---|---|---|
| Client-side, URL state, no login | Question set → purpose/role/impact gates | `platform` question and Platform panel |
| `source_url` / `_source_note` / `last_verified` | System type → technology tags only | AU, UK, GDPR, APRA mappings → optional "jurisdiction packs" later |
| Date-aware states + date/URL CI | Additive risk score → tier + characteristic-based risks | OWASP as a framework result → linked references under "secure & resilient" |
| Markdown export, disclaimer, licences | Controls + actions → requirements library with artefacts and crosswalk | Top-7 risk cut-off, effort-first action ranking |
| React/Vite, GitHub Pages | Positive-only tests → legal golden suite with negative cases | `startsWith('id')` hack, dead code |

---

## 5. Action plan

### Phase 0: Containment on the live site (1–2 days)

The live site currently gives wrong legal classifications. Before any rebuild:

1. Add a site-wide notice that EU AI Act classification is under review and that results must not be relied on for classification.
2. Hot-fix the worst errors:
   - add an Art. 5(1)(f) notice for biometric + employee/education contexts
   - exclude fraud detection from 5(b)
   - demote GPAI Arts. 53–55 to "information" for non-GPAI-providers
   - fix the `eu_ai_act_art_9` predicate
   - remove the dangling `eu_ai_act_art_12` reference
3. Add predicate-value and reference validation to `scripts/validate-data.js` so this class of error fails CI.

**Exit:** the probe scenarios in §3.1 no longer produce prohibited or high-risk false negatives, and CI fails on unknown values.

### Phase 1: Specification and golden tests (1–2 weeks)

1. Write the purpose catalogue (Annex III points + about 10 common non-high-risk purposes) with carve-outs.
2. Write the classification decision function spec, including Art. 5, Annex I, Annex III, 6(3), Art. 50, roles and Art. 25 triggers.
3. Define the tiering formula and thresholds, with worked examples at each tier.
4. Build a **golden suite of about 40 scenarios** with expected classification, role, tier and *must-include / must-exclude* requirements. Include the §3.1 cases, 6(3) exemptions, provider vs deployer pairs, Annex I devices and "Unsure" paths.
5. Check each golden scenario against the Commission guidelines and the recitals, citing the paragraph used (see §6.3).

**Exit:** spec and golden suite committed; data and scenario consistency checks pass in `npm test`; the engine comparison is skipped until Phase 2. (v1 cannot run v2 answers; its failures are the §3.1 probe.)

### Phase 2: Engine rebuild (1–2 weeks)

1. Add `classify(answers) → { status, annexRef, role, trace[], undetermined[] }` as pure, fully unit-tested functions.
2. Add `tier(answers, classification)` and `resolveRequirements(...)` with crosswalk de-duplication.
3. Handle unknowns: every "Unsure" produces an undetermined item plus a conservative assumption, and is never silently dropped.
4. Add a URL `v=2` schema. v1 URLs open a "re-run with the new questions" page that pre-fills what can be mapped.

**Exit:** the golden suite passes, plus property tests (e.g. no answer combination yields an empty requirements list, and "prohibited" always short-circuits).

### Phase 3: Content (2–3 weeks, can overlap Phase 2)

1. EU AI Act requirements by role and gate: Arts. 4, 5, 6, 9–15, 16–17, 25–27, 43, 47–50, 72–73, 86, and 53–55 (GPAI providers only).
2. ISO/IEC 42001: cl. 4–10 as org-level requirements and Annex A as the control vocabulary. Reference ISO/IEC 23894 (risk process) and 42005 (impact assessment) as the method for the assessment artefacts.
3. NIST AI RMF: GOVERN at org level, and MAP/MEASURE/MANAGE subcategories at use-case level. AI 600-1 overlay for GenAI.
4. Write an artefact definition for each requirement (what "done" looks like).
5. Re-verify every date and citation, especially the Omnibus amendments, against the primary source and record `last_verified`.

**Exit:** every requirement has a source, a crosswalk and an artefact, and validation passes.

### Phase 4: UX (1–2 weeks)

1. Adaptive questionnaire with progress shown as "gates", plain-language help, and "Unsure" on every question.
2. Output page: classification card (with "because" traces) → tier → first 5 actions → requirements by gate → risk considerations → open questions.
3. Optional organisation profile that persists alongside the use case in the URL.
4. JSON and CSV export alongside Markdown. Print view.

**Exit:** usability test with three personas (solo governance lead at an SME, a mid-size risk manager, an enterprise AI CoE). Each can classify a use case and name their first action in under 10 minutes.

### Phase 5: Release and maintenance

1. Ship v2 with a changelog that explains the methodology change and links to the spec.
2. Keep the date-crossing and URL workflows. Add a quarterly golden-suite review to the same maintenance issue.
3. **Later and optional:** jurisdiction packs (GDPR, UK, AU) as add-on requirement sets using the same schema, reusing current content where it is still accurate.

---

## 6. Decisions (agreed 2026-10-20)

1. **Repo:** stay in this repo and continue to v2. Traffic is close to zero, so v2 **replaces v1 in place** at launch. There's no `/v2` route, no parallel running and no v1 URL migration (old links land on the questionnaire). Phase 0 shrinks to a notice on the live site.
2. **Scope:** a global core (EU AI Act + ISO/IEC + NIST AI RMF) with **country packs** on the same requirement schema. Packs are in scope for v2 if they're cheap to add. Order: GDPR (EU), UK, AU, then others as contributed. Jurisdiction becomes a pack selector and no longer drives core logic.
3. **No expert review.** There's no budget, the project is open source, and with near-zero traffic the risk is low. Mitigations:
   - Ground the golden suite in the official European Commission guidelines (on prohibited practices and on high-risk classification) and in the Act's recitals. Those documents stand in for the reviewer.
   - Every classification trace cites its article.
   - "Unsure" at the Art. 5 and Annex III gates is treated conservatively.
   - Publish the spec and golden scenarios in the repo and invite corrections via issues.
4. **Governance tier:** yes. A published rule matrix (impact severity × autonomy, with floors). No weighted scoring.
5. **Org layer:** deferred. v2 takes only two org inputs: SME yes/no, and whether an AI policy/inventory exists.
