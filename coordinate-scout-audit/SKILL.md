---
name: coordinate-scout-audit
description: Select and validate a saved private Scout capture batch, compare headline prices and offers from its evidence, and report Match, Mismatch, or Needs Review. Preserve source rows, capture age and coverage gaps. Normal audits do not browse; request a separate capture refresh when required.
---

# Scout — Headline pricing and offer comparison

## Two responsibilities

1. **Standalone capture pipeline:** maintained Playwright/Chromium code loads the inventory and stores screenshots, rendered text, timestamps, and failures in private Vercel Blob. See [capture pipeline](../docs/capture-pipeline.md).
2. **Scout comparison workflow:** select one saved capture batch, validate its evidence, compare headline facts, and produce the report. Normal audits do not navigate campaign pages, click tabs, run Chromium, or start capture jobs.

Playwright is the pipeline's browser automation library, not a remotely callable agent or MCP service. The implemented interface is the host CLI; do not invent a capture/refresh tool. Saved-batch import, comparison, report assembly, and manual refresh-handoff records are implemented. Scheduling and automatic refresh submission are not enabled. Follow the real interfaces and limitations in [docs/run.md](../docs/run.md).

## Headline-only scope — unchanged

Compare only displayed headline/offer-card prices and billing units; basic product/plan names; headline savings, rewards, discounts, benefits, and promo codes; and promotional durations directly in the headline/card. Use saved primary offer states across the page and captured relevant product tabs, not just the first viewport.

Exclude eligibility (including inline qualifications), detailed requirements, full disclosures, legal wording, redemption procedures, and administrative terms. Do not open terms, FAQs, supporting panels, or disclosure modals. Hidden-loaded text is not a headline offer. Missing supporting details and failed disclosure interactions are nonblocking. Never assume unreadable headline content matches.

Preserve headline meaning such as "from," "up to," reward type, and monthly/per-line units. Ignore layout, duplicate UI copies, harmless formatting, and excluded clauses; do not require full-card literal equality. Requirements checking and Creative ID validation remain disabled; Creative Name is context only.

## Browser setting and evidence

Compare saved rendered text first; use screenshots only when needed to read primary offer information, such as an image-only price or an ambiguous extracted code. Do not compare layout or require separate desktop/mobile/tablet runs or cross-device parity. Missing mobile/tablet captures alone never cause Needs Review. Apple/Android product tabs, plan/speed/line selectors and other views remain in scope when they reveal different advertised products, prices or offers; these are product views within the same browser setting.

Keep the existing Chromium 1440 × 900 setting consistent for both URLs as a capture implementation detail, not a desktop-testing deliverable. Keep the existing profile ID for compatibility. Missing or unreadable necessary product-view headlines remain legitimate gaps; a missing browser-device variant is not one.

## Sources

Read this guide, [audit config](../config/audit-config.json), and the four active specialists from one recorded instruction commit:
- [Pricing](../pricing-comparison-workflow-guide.md)
- [Promo codes](../compare-promo-codes.SKILL.md)
- [Benefits](../compare-benefits-inclusions.SKILL.md)
- [Durations](../compare-dates-durations.SKILL.md)

Use [the CSV](../data/scout-url-inventory.csv) to establish the requested records and [pilot guards](../config/pilot-config.json) only for an explicit pilot. Capture provenance may legitimately reference an older instruction/runner/inventory revision; record it separately from the comparison instruction revision. Never rewrite provenance to make a batch compatible.

# Stage 1 — Select the batch

## 1.1 Establish requested records and evidence source
**Goal:** Know exactly what the PM wants compared and which saved evidence will be used.

1. Preserve the supplied record filter; without one, the requested scope is the full inventory, not merely every row in an arbitrary small batch.
2. Use the user's explicit batch ID or an explicitly configured selection. If none is supplied, inspect authorized batch manifests and obtain/record a compatible selection; ask for the missing choice when needed. Do not silently choose the newest name, an older fallback, or a later smoke test.
3. For "latest," select the latest eligible batch covering the requested records/profile after inspecting manifests, and disclose the exact choice. A later two-URL smoke batch does not replace a full batch.
4. Assign a separate comparison/report ID and record the selected capture batch ID, manifest path, requested rows, and selection reason. Do not reuse a capture ID to overwrite a prior report.

# Stage 2 — Validate saved evidence

## 2.1 Verify manifest, provenance, and row mappings
**Goal:** Ensure that the selected batch actually represents the requested URL pairs.

1. Use authorized private storage retrieval. Require a completed manifest with matching batchId, kind page-capture-batch, and supported schema. A finished_with_gaps batch is usable evidence, not proof that all comparisons can complete.
2. Verify downloaded file checksums/sizes using the maintained storage CLI. Stop using corrupt or mismatched artifacts; do not replace them with older files silently.
3. Check inventory revision/hash, selected records, original/prepared URLs, vanity/tracking entry keys, region/profile, timestamps, and capture failures. Use inventory.json for original full row/target records; manifest selectedRows is a count, not a selection list.
4. Match requested records against exact source values and mappings, not row numbers alone. If the inventory changed, identify the difference and obtain a compatible batch or explicit historical scope; never compare a stale URL under a current row label.
5. Prepare the private audit with comparison/saved_captures.py as documented in docs/run.md. It validates the complete source mapping, inventory and runner hashes, capture settings, selected rows, and saved artifacts; a small batch cannot supply a full audit. Stop on validation failure rather than fabricating input.json.
6. Preserve all original rows and duplicate mappings. Reuse equivalent saved pair evidence, not another row's unrelated offer conclusion.
7. Do not mutate supplied URLs, remove parameters, substitute destinations, or validate Creative IDs. Keep stored redirects/failures and missing input slots visible.

## 2.2 Assess age and headline coverage
**Goal:** Make evidence age and limitations explicit before interpreting parity.

1. Record comparison time, capture window, and age of the actual states used for each side. Prefer state capturedAt; label an entry timestamp fallback. Manifest createdAt is packaging time, not a substitute for page capture time.
2. Apply a user-specified/approved maximum age when present. No universal freshness threshold is configured: report age and make the result explicitly "as captured," rather than claiming current live parity. Unknown timestamps mean unknown age, not fresh evidence.
3. If the user requires current evidence, an approved limit is exceeded, age cannot satisfy the request, or necessary headline states are missing/unreadable, request a refresh through Stage 4. Keep affected comparisons unresolved unless a valid independent mismatch is already confirmed.
4. Read saved rendered text and state/coverage metadata first. Inspect screenshots only when necessary primary offer facts cannot be read reliably from text. A captured entry or full-page screenshot alone does not prove every headline is readable. Standard ARIA tabs were captured; custom controls may need adapters. A cookie banner may obscure an image even when text exists.
5. Record the implemented side-review coverage fields: banner (clear/obstructed/uncertain), primary_views (complete/incomplete/uncertain), and basis. These assess only necessary headline evidence in the one browser setting, not responsive layout or a browser-device matrix. Mark primary_views complete when the required product offers are readable; missing mobile/tablet runs do not make it incomplete. Use clear when saved text or another verified state supplies all affected facts; do not let an irrelevant banner create a gap.
6. Missing supporting terms, failed disclosures, and unconfirmed scrolling alone are nonblocking. Missing/unreadable necessary headline content is a real gap. A location label difference alone does not require a new market/ZIP capture; compare the observed headlines.

# Stage 3 — Compare saved headline facts

## 3.1 Align offers and apply four checks
**Goal:** Compare recognizable primary offers using only the selected batch.

Use basic product/plan, provider, headline purpose, and primary offer context to align records. A changed product in an identifiable corresponding headline can be Mismatch; equal amounts alone do not establish correspondence. Unrelated support/default pages with no comparable offer require review.

Apply Pricing to displayed values/units, Promo Codes to exact displayed codes, Benefits to headline rewards/inclusions, and Durations to directly stated promotional timing. Reuse the same saved states and offer map. "60-day money-back guarantee" can agree without reading its detailed terms. Eligibility differences do not affect this workflow.

Preserve exact primary quotes/images and canonical fields. A recheck means reviewing another already-saved state in the same batch, not browsing or clicking. If needed evidence was never captured, use Stage 4. Do not fill holes from a different batch without explicit source selection and per-side provenance; default to one selected batch.

## 3.2 Distinguish absence from unreadability
**Goal:** Detect missing offers without guessing unseen content.

An advertised headline offer confirmed absent from its corresponding readable captured page/catalog is Mismatch. An unreadable/missing primary state is not confirmed absence. No displayed code or duration on either readable counterpart is acceptable; do not demand optional fields or requirements.

# Stage 4 — Request refreshes separately

## 4.1 Describe the missing capture
**Goal:** Obtain necessary evidence without covert live browsing or unsupported automation.

Record batch ID, exact affected source rows/URLs and roles, relevant product/tab state, missing headline field, reason (age, failure, inventory change, or unreadability), and requested freshness if specified. Send the request to the authorized pipeline operator/user through the available task interface. A written refresh request is not a submitted job; do not invent a job ID, polling tool, or schedule.

Continue independent comparisons from valid evidence. If a refresh is not available, report the affected records as Needs Review with a specific reason; never assume a match. Run the separate capture CLI only as a separately authorized capture task, not as a normal comparison step. Pipeline execution follows [capture-execution.md](../references/capture-execution.md).

When a replacement batch is delivered, validate it from Stage 1 and record the explicit switch and affected rows. Preserve the earlier batch/report. Never silently substitute older evidence for failed fresh captures. The maintained importer supports one batch per audit. Do not mix batches or manually merge evidence into its verified layout; select a replacement compatible batch instead.

# Stage 5 — Save and decide

## 5.1 Preserve traceability
**Goal:** Keep comparison conclusions tied to immutable capture evidence.

Save comparison ID/instruction revision, selected batch/manifest, capture runner/inventory provenance, comparison time, per-side capture times/ages, original row/URL mappings, reviewed states, headline facts, and specific gaps/refresh requests. Store privately and separately from immutable capture objects. Resume only compatible work; no historical report relabeling.

Use comparison/saved_captures.py to prepare input.json from the selected verified batch, then comparison/compare.py and reporting/build.py as documented in docs/run.md. The report carries captureSource, capture windows and timestamped evidence; necessary coverage gaps produce a manual Capture refresh handoff document. These commands do not browse or submit refresh jobs. Relative per-side age and any freshness policy assessment must also be recorded in Scout's delivered summary/private review log; the current CLI has no maximum-age enforcement option.

## 5.2 Assign the unchanged public result
**Goal:** Apply only the PM's headline comparison definitions.

1. **Mismatch:** A headline price or offer differs, or an advertised offer is absent from the corresponding readable page. Mention additional necessary evidence gaps.
2. **Needs Review:** No confirmed mismatch establishes the result, and a page is unavailable, necessary headline content cannot be read, or no identifiable comparable offer exists. Missing inputs, incompatible mappings, or an unmet freshness requirement leave necessary evidence unavailable; explain which.
3. **Match:** Headline prices and offers agree with readable, applicable saved evidence. State its capture age/window; this is not a live check.

Missing browser-device runs, layout differences, and screenshots unnecessary for reading primary facts never block Match. Supporting details/disclosure failures never block Match. An inactive requirements check is not incomplete. Identical excluded contradictions do not require interpretation. Never assume unreadable headlines match.

# Stage 6 — Report

## 6.1 Reconcile and deliver
**Goal:** Give the PM a complete simple result list with honest evidence provenance.

Use **Headline pricing and offer comparison** as the title. Show selected batch ID, capture window/age, comparison time, profile, and a short coverage/freshness note, followed by counts and:

| Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason |
| --- | --- | --- | --- | --- | --- | --- |

Account for every requested record, including rows absent from the selected evidence. Reconcile counts and shared mappings. Give precise reasons, such as "Tracking headline unreadable in selected batch; refresh requested," not "terms unverified." Keep detailed age/provenance per side in evidence; do not use comparison/publication time as capture time.

The current packager still requires at least one screenshot to mark an entry captured; see the runtime follow-up in docs/run.md. Report this as a pipeline limitation if encountered, not as a missing device test. Do not fabricate valid capture status or bypass verification.

The report builder includes verified batch provenance and capture windows. Include relative age and any freshness assessment in the delivered summary; do not claim an automated age gate or relative-age viewer field exists. Publication is a separately authorized action. Preserve private storage/authentication, historical reports, and capture history. No scheduling or refresh automation is implied.
