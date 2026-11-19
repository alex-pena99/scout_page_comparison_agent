---
name: coordinate-scout-audit
description: Scout's master workflow for comparing advertised pricing and offers across vanity and tracking URLs. Coordinate shared captures and five focused checks, then report Match, Mismatch, or Needs Review for every requested record. Exclude legal/disclosure perfection, AutoPay enrollment mechanics, and commercial-correctness investigations.
---

# Scout — Master Pricing and Offers Guide

## Purpose and scope

Answer one question: **Do these pages advertise the same prices and offers?**

Compare advertised monetary values, promo codes, benefits/inclusions, offer dates/durations, and qualifications that materially change the deal. Preserve terms such as "up to," "per line," "with a bundle," and "with eligible trade-in."

Do not audit legal wording, disclosure completeness, internal consistency, commercial correctness, or administrative mechanics. AutoPay enrollment, activation/start windows, first-credit processing, proof/submission procedures, and fulfillment estimates are outside scope. AutoPay or paperless billing as a condition of an advertised price remains in scope.

The same conflicting statements on both pages do not create a cross-page difference. Do not investigate which is commercially correct. Identical ambiguity is nonblocking when correspondence and cross-page agreement can be established without resolving it.

Use the five specialists below for their focused checks. This master defines scope and final results; older instructions, raw extraction flags, or runtime warnings must not broaden the audit. Never discard a real in-scope difference to obtain Match.

## Sources

Resolve paths from the repository root:

| Source | Path |
| --- | --- |
| Inventory | [data/scout-url-inventory.csv](../data/scout-url-inventory.csv) |
| Capture defaults | [config/audit-config.json](../config/audit-config.json) |
| Development pilot | [config/pilot-config.json](../config/pilot-config.json) |
| Pricing | [pricing-comparison-workflow-guide.md](../pricing-comparison-workflow-guide.md) |
| Promo codes | [compare-promo-codes.SKILL.md](../compare-promo-codes.SKILL.md) |
| Benefits | [compare-benefits-inclusions.SKILL.md](../compare-benefits-inclusions.SKILL.md) |
| Dates | [compare-dates-durations.SKILL.md](../compare-dates-durations.SKILL.md) |
| Requirements | [compare-advertised-requirements.SKILL.md](../compare-advertised-requirements.SKILL.md) |

# Stage 1 — Start

## 1.1 Select records and load instructions
**Goal:** Establish the requested audit without silently changing its size.

1. Read this guide, capture config, inventory, and all five specialists from one recorded commit.
2. Use every inventory record unless the user supplies a filter.
3. For an explicitly requested pilot, use its pinned inventory revision/hash and exact record guards. Record both revisions; abort invalid pilot selection before capture, never fall back to the full inventory.
4. Retain source row numbers (header is row 1), account, URLs, position, and Creative Name. Ignore Creative ID in legacy inputs; it is not an audit field.
5. Record audit ID, start time, selected records, and desktop coverage. If a required source cannot load, record the blocker; do not pretend the check ran.

## 1.2 Verify capture capability
**Goal:** Confirm the dedicated runtime can obtain page evidence.

Use the configured capture routine and Chromium, not the PM's personal browser. Verify actual launch/capture capability. A runtime-wide failure leaves selected records Needs Review; do not substitute an empty comparison.

# Stage 2 — Prepare

## 2.1 Preserve usable inputs
**Goal:** Test the supplied links without campaign validation.

1. Parse the CSV using its five headers: Account, Vanity URL, Tracking URL, Position, Creative Name.
2. Retain partially populated records. Missing or unusable URLs require review, not substitution with a root page.
3. For navigation only, trim surrounding whitespace and add https:// when absent.
4. Open tracking templates as supplied. Preserve all parameters, including c=, placeholders, and query order; ordinary browser encoding and redirects are allowed.
5. Do not invent click values, replace {lpurl}, or compare parameters against campaign metadata. Placeholder presence alone is not a problem.
6. Use Creative Name only as supporting context; a label disagreement alone cannot change a result.

## 2.2 Plan reusable work
**Goal:** Capture once and reuse evidence across records and checks.

Key reuse by original/prepared full URL, capture settings, and relevant state within the same run. Do not merge different tracking templates because their destinations look alike. Preserve every original record and row mapping. Reuse conclusions only for equivalent captures and comparison scope.

# Stage 3 — Capture

## 3.1 Read advertised content first
**Goal:** Capture prices and offers without exhaustively opening every page control.

1. Apply config/audit-config.json: desktop Chromium, 1440 x 900, equivalent locale/region, clean isolated contexts, four concurrent captures, and bounded retries/timeouts.
2. Follow redirects and verify meaningful rendered content. Network-idle or dollar presence alone does not prove readiness.
3. Read the rendered page, scrolling for lazy content. Identify offer-bearing sections and product tabs; inspect distinct advertised offer views on both sides.
4. Save original/navigation/final URLs, text, offer locations, selected views, and timestamps. Use screenshots for image-based offers or unclear visual associations.
5. Keep hidden-loaded references separate. Extraction may retain them diagnostically; they do not establish active offers.

## 3.2 Open additional content only for an offer reason
**Goal:** Obtain necessary offer evidence with minimal interactions.

Open a panel, accordion, pop-up, FAQ, frame, or supporting detail only when its visible label/context suggests an additional in-scope offer or it is needed to compare an advertised fact. A brand heading alone does not require exhaustive inspection of all its content.

Before opening, record the offer fact or offer-bearing section to verify. Reuse information already captured; do not reopen redundant details merely to complete a UI checklist. Do not inspect legal-policy pages, checkout, forms, or excluded administration.

Relevant image-based offer text still needs visual inspection. Do not infer unseen content is irrelevant merely because capture is difficult.

## 3.3 Classify capture gaps by relevance
**Goal:** Prevent incidental browser failures from becoming false Needs Review results.

After the configured transient retry or targeted recheck:
- **Nonblocking note:** The failed action concerns excluded content or repeats sufficient, equivalent offer evidence already captured. Record the supporting reason; continue comparison.
- **Blocking gap:** An in-scope fact, correspondence, or plausibly distinct offer remains unavailable. Name the section, missing evidence, and affected check(s)/records.
- **Uncertain relevance:** Visible context suggests possible uncaptured offers but relevance cannot be resolved. Keep that specific gap for review; do not assume redundancy.

A timeout is an execution event, not a content finding. It blocks only when it leaves necessary pricing/offer evidence missing. Apply gaps only to records/checks depending on that evidence. No unlimited retries, access-control bypasses, or certificate-warning bypasses.

# Stage 4 — Compare

## 4.1 Pair corresponding offers
**Goal:** Compare the same deal on both pages.

Use provider, product, plan/speed, device, advertised benefit, and surrounding headings. Share one offer map across all checks. Layout and position alone do not determine correspondence.

Sales versus unrelated customer support is Needs Review, not a list of missing benefits. A confirmed one-sided advertised benefit within a corresponding experience is a real difference after checking the relevant offer context. Keep unresolved association specific and continue independent comparisons.

## 4.2 Apply five focused checks to shared evidence
**Goal:** Cover pricing and offer information without five separate browsing workflows.

| Specialist | Evaluate |
| --- | --- |
| Pricing | Advertised dollar values, fees, savings, rewards, billing basis, and association with the correct offer. |
| Promo codes | Exact advertised codes and materially different usage instructions. |
| Benefits | Reward/device identity, quantity, equipment, installation, included features, and guarantees. |
| Dates | Offer start/end, promotion length, price locks, guarantee periods, advertised installment/credit periods, and explicit offer/code expiration. |
| Requirements | Customer status, bundles, AutoPay/paperless conditions, plans, trade-ins, line counts, switching, and other qualifications that materially change the advertised deal. |

Read each full specialist guide. Provide the validated rows, shared captures, and offer map; request only missing in-scope evidence. Cross-references are handoffs, not recursive full audits. Share reveals and rechecks across checks and records.

Preserve exact quotes alongside interpretations. Preserve meaningful values, units, qualifiers, and AND/OR logic. Do not treat punctuation, formatting, repeated UI copies, or a different DOM split as a changed deal.

## 4.3 Resolve findings without correctness investigations
**Goal:** Confirm actual cross-page differences and stop unnecessary work.

Recheck an apparent difference or omission once when needed, using equivalent offer states. Do not restart unaffected checks. Preserve changing observations rather than selecting a preferred attempt.

Do not investigate identical internal contradictions or AutoPay start-window mechanics. If material cross-page agreement cannot be established because offer association or relevant content keeps changing, retain that specific uncertainty.

Merge duplicate findings from different specialists; retain their check labels. Keep optional notes separate from blocking gaps. Raw INCOMPLETE from an unnecessary interaction is a nonblocking note after relevance assessment, not automatically an incomplete audit.

# Stage 5 — Save and decide

## 5.1 Preserve evidence and progress
**Goal:** Make results traceable and recoverable.

Save completed captures and comparisons through the configured durable storage, including source revision/row, exact URLs, settings/time, offer associations, supporting passages, check results, blocking gaps, and nonblocking notes. Resume only compatible work from the same audit. Disclose save failures separately; they are not website mismatches.

## 5.2 Assign the public result
**Goal:** Give every record one meaningful outcome.

Apply in order:
1. **Mismatch:** A confirmed in-scope cross-page difference exists. Mention additional blocking gaps in the reason.
2. **Needs Review:** No confirmed mismatch establishes the result, but an unusable input, unrelated destination, unresolved offer association, or necessary offer evidence gap prevents comparison.
3. **Match:** In-scope advertised prices and offers agree, with sufficient evidence for all applicable checks and no blocking gap.

A completed search finding no code/date/benefit on either page is acceptable; missing optional statements are not invented requirements. Excluded details, identical internal contradictions, nonmaterial wording, and unnecessary failed interactions cannot block Match. A possible unseen distinct offer cannot be dismissed without evidence.

| Example | Outcome |
| --- | --- |
| $35 versus $45 for the same offer | Mismatch |
| $100 reward card versus $200 | Mismatch |
| Both have identical conflicting disclosure statements | No parity blocker; optional note only |
| AutoPay discount starts within 2 versus 3 bills | Excluded mechanics; no result impact |
| One page requires AutoPay for $35; the other explicitly does not | Mismatch |
| Optional panel fails, but equivalent offer facts are already captured | Nonblocking note |
| Unread panel visibly advertises additional plans unavailable elsewhere | Needs Review for affected comparisons |

# Stage 6 — Report

## 6.1 Reconcile and deliver
**Goal:** Give the PM a complete, simple result list.

Confirm every selected row has one result and every applicable specialist has completed its in-scope assessment or identified a specific blocker. Preserve duplicate-row mappings and reconcile totals; reused captures are not independent tests.

Return counts followed by:

| Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason |
| --- | --- | --- | --- | --- | --- | --- |

Use short, specific reasons. For a genuine gap, say what remains unverified and what already agrees, for example: "Checked offers agree; additional AT&T plan prices could not be inspected." Do not report only "panel timeout."

Keep nonblocking notes and detailed evidence available for follow-up; do not flood the PM report. State desktop advertised-pricing/offer scope once. Match is a parity result, not certification of every page detail or commercial correctness. Label interrupted runs partial and account for unprocessed records as Needs Review.
