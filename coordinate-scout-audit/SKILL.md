---
name: coordinate-scout-audit
description: Compare default-page headline prices and offers from one validated private Scout capture batch. Return Match, Mismatch, Needs Review or No offers displayed, preserving evidence age and every requested row. Normal audits never browse live pages.
---

# Scout — Headline pricing and offer comparison

## Scope: default views only

Compare prices and simple offer headlines visible on the initial page, including content reached by scrolling. Use the initially selected product view only. Include basic product/plan identity, prices and billing units, headline savings/rewards/benefits, displayed promo codes, and promotional durations stated directly in a headline or offer card. Preserve meaningful `from`, `up to`, reward types and per-line/monthly units. Equal amounts on unrelated products do not establish a Match.

Do not open or compare alternate Apple/Android tabs, speed or line selectors, carousel slides, provider panels, disclosures, FAQs or other detail views. These remain excluded even if the batch contains them. Missing alternate views never create a gap. Exclude eligibility (even inline), AutoPay administration, trade-in/bundle qualifications, legal text, redemption procedures and guarantee details. Requirements and Creative ID checks remain disabled. Creative Name is context only.

Compare rendered baseline text first. Read its screenshot only when necessary to understand a headline image or ambiguous text. Do not compare layout or require desktop/mobile/tablet variants. A baseline means the initial page after scrolling and safe dismissal of a known obstructing consent banner; it does not mean only the first screen.

## Stage 1 — Establish the audit
**Goal:** Know the exact records, instructions and evidence source.

- Read this coordinator, [config](../config/audit-config.json), [pricing](../pricing-comparison-workflow-guide.md), [promo codes](../compare-promo-codes.SKILL.md), [benefits](../compare-benefits-inclusions.SKILL.md), and [durations](../compare-dates-durations.SKILL.md) from one recorded revision.
- Use the requested records from the [inventory](../data/scout-url-inventory.csv). Without a filter, use the full inventory. Preserve duplicates and missing inputs. Use [pilot guards](../config/pilot-config.json) only for an explicit pilot.
- Record one explicit compatible capture batch ID and a new audit/report ID. A recent smoke batch is not a full-inventory batch. For “latest,” inspect manifests and disclose the chosen compatible batch; never choose by filename alone.
- Capture provenance can reference an older instruction/runner revision. Record it separately from the current comparison revision; never rewrite provenance.

## Stage 2 — Validate and read the default evidence
**Goal:** Confirm each page belongs to the requested URL and is readable.

- Follow [docs/run.md](../docs/run.md). Private retrieval verifies artifact hashes/sizes; the importer validates the completed manifest, inventory hash/revision, exact rows/URLs, entry mappings, profile, runner hash, timestamps and failures. Stop on validation failure. Never fabricate input/checkpoints or silently mix batches.
- Use only advertised baseline states. The importer excludes alternate interaction states for `default-view-headlines-v1`. Reuse an exact entry/pair's evidence across its mapped rows.
- Preserve supplied tracking URLs, placeholders, redirects and failures. Do not repair inputs, invent values, validate Creative IDs, bypass TLS or bypass authentication.
- Record the capture window and age of evidence actually used, plus comparison time. Manifest creation time is packaging time. Apply an explicitly requested age limit; otherwise label results “as captured.” Unknown age is not fresh evidence. No automatic age gate is implemented.
- Assess only necessary default-page content. Record `coverage.banner`, `coverage.default_view` and a short basis. A banner is nonblocking when the needed headline facts remain readable. Unconfirmed scroll completion alone does not prove an offer is missing; assess the actual content. A location label alone does not require a ZIP submission.

## Stage 3 — Compare the displayed headlines
**Goal:** Find supported price and offer differences with minimal review.

- Align offers using provider, basic product/plan and headline purpose. Compare the four specialist fields on the same evidence. Ignore formatting, duplicate UI copies and excluded clauses.
- Optional fields need not exist: no displayed code or duration on either side is acceptable. Do not seek missing details. Matching “60-day money-back guarantee” headlines require no guarantee terms.
- A recheck means rereading the same batch's default evidence, not browsing, clicking or consulting saved alternate views. Normal audits never start the separate capture pipeline.
- A confirmed absent offer on the corresponding readable default page is a difference. Unreadable content is not confirmed absence. Unrelated sales/support experiences can remain Needs Review.
- When both default pages are readable and genuinely display no headline offers, explicitly record `no_offers_displayed: true` on both sides with cited evidence and complete coverage. Empty extraction alone is insufficient.

## Stage 4 — Save a fresh scoped review
**Goal:** Make decisions reproducible without carrying old coverage demands forward.

- Create new reviews with top-level `scope_version: default-view-headlines-v1`, using the schema in [docs/run.md](../docs/run.md). Never relabel an old review or merely delete its gaps to manufacture a Match.
- Cite exact visible quotes or image transcriptions and canonical fields. For necessary unreadable default content, record a scoped gap with `scope: default_view`; do not copy alternate-tab or disclosure gaps.
- Save current instruction revision, source batch/provenance, original row mappings, facts, coverage basis, timestamps and evidence references privately. Checkpoint progress and resume only compatible work.
- For unavailable/unreadable default evidence or an unmet freshness requirement, record a manual refresh handoff identifying the batch, original rows/URLs/roles, missing default-page field and reason. It does not dispatch a job. Continue unaffected rows. Capture, scheduling and refresh submission remain separate authorized work.

## Stage 5 — Assign the result
**Goal:** Produce an honest result for every requested row.

| Result | Rule |
| --- | --- |
| Mismatch | A default-view price/headline differs or an offer is confirmed absent from the corresponding readable default page. A supported independent mismatch takes precedence over additional evidence gaps. |
| Needs Review | A source is missing/unavailable, necessary default headline information is unreadable, or the pages cannot meaningfully be compared, without a supported independent mismatch. |
| Match | The readable default-view headline offers agree. No alternate-view or supporting-detail completeness requirement applies. |
| No offers displayed | Both readable default views explicitly show no headline offers. This is separate from Match and is not inferred from empty extraction. |

Use the maintained comparison and report commands. They validate scope, evidence references and coverage; they do not independently extract or verify the meaning of reviewer-entered facts. The reviewer must check those facts against the cited baseline. Never assume unseen content matches.

## Stage 6 — Verify and report
**Goal:** Give the PM a complete simple report with accurate scope and counts.

Use **Headline pricing and offer comparison** with an explicit **default views only, including scrolling** scope note. Include batch ID, actual capture window/age, comparison time, all four counts, and every requested row with its URLs, result, reason and evidence. Counts must sum to the requested records; No offers displayed must not increase the Match count.

Follow [docs/run.md](../docs/run.md) for packaging/private publication and signed-in verification. The updated viewer must support all four statuses before publishing a new-scope report. Keep authentication, private evidence and older reports intact. No new deployment, schedule or refresh is implied by reading this guide.

For the controlled full-sheet test, follow [the rollout handoff](../docs/DEFAULT_VIEW_SCOPE_2026_11_19.md). Explain result changes against the previous broader saved-evidence audit. A narrower scope is not an equivalent-coverage speed benchmark. Do not promise a lower Needs Review count before rerunning.
