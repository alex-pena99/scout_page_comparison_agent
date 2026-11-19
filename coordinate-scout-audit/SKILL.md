---
name: coordinate-scout-audit
description: Scout's master workflow for headline pricing and offer comparison between supplied vanity and tracking pages. Compare displayed prices/units, basic products/plans, headline savings/rewards/benefits/codes, and promotional durations directly in headlines or offer cards. Exclude all eligibility, terms, disclosures, FAQs, and administrative procedures.
---

# Scout — Headline pricing and offer comparison

## Scope and authority

Compare ONLY the headline offer presented on each supplied page:
- Displayed prices and billing units.
- Basic product or plan names.
- Headline savings, rewards, discounts, benefits, and promo codes.
- Promotional durations stated directly in the headline or offer card.

Read primary offer text/cards, including headline offers farther down the rendered page and relevant product tabs. This is not limited to the first viewport. A headline guarantee such as "60-day money-back guarantee" is an advertised benefit/duration; its detailed terms are not part of the comparison.

Do not check eligibility, bundles/trade-in/AutoPay qualifications, full disclosures, legal wording, detailed requirements, redemption procedures, or administrative terms, even if such conditions appear beside the price. Do not open terms, FAQs, disclosure modals, or supporting-detail panels to complete an offer. Do not investigate commercial correctness or internal consistency. Hidden-loaded references are not headline offers.

This scope overrides older guides and runtime defaults. Missing supporting details and failed disclosure interactions cannot block Match. Never assume unreadable headline text matches. Preserve meaningful headline modifiers such as "from," "up to," the reward type, and per-month/per-line billing units; ignore eligibility clauses rather than making full-card literal text equality a requirement.

## Repository sources

| Source | Path |
| --- | --- |
| Inventory | [data/scout-url-inventory.csv](../data/scout-url-inventory.csv) |
| Capture defaults | [config/audit-config.json](../config/audit-config.json) |
| Capture execution | [references/capture-execution.md](../references/capture-execution.md) |
| Explicit development pilot | [config/pilot-config.json](../config/pilot-config.json) |
| Headline pricing | [pricing-comparison-workflow-guide.md](../pricing-comparison-workflow-guide.md) |
| Headline promo codes | [compare-promo-codes.SKILL.md](../compare-promo-codes.SKILL.md) |
| Headline benefits | [compare-benefits-inclusions.SKILL.md](../compare-benefits-inclusions.SKILL.md) |
| Direct promotional durations | [compare-dates-durations.SKILL.md](../compare-dates-durations.SKILL.md) |

The legacy [requirements guide](../compare-advertised-requirements.SKILL.md) is disabled for this workflow. Do not run it or require its completion. There are four active checks, not five.

# Stage 1 — Start and preserve inputs

## 1.1 Load the requested audit
**Goal:** Establish reproducible scope and keep every requested record.

1. Read this guide, config, active specialists, and inventory from one recorded commit.
2. Use all inventory records unless the user supplies a filter. Preserve source rows, including duplicate mappings; header is CSV row 1.
3. For an explicit pilot, verify its pinned inventory/hash and exact selection. Abort invalid selection before comparison; never fall back to all records. Record both instruction and pilot-inventory revisions.
4. Preserve Account, Vanity URL, Tracking URL, Position, and Creative Name. Ignore Creative ID in legacy inputs. Creative Name is context, not a result gate.
5. Record audit ID, timestamps, instruction/runner revisions, config version, and report scope. Label every new report exactly **Headline pricing and offer comparison**.

## 1.2 Prepare navigation
**Goal:** Compare supplied experiences without repairing campaign routing.

Preserve original URLs and every parameter, including c=, placeholders, and query order. For navigation only, trim surrounding whitespace, add https:// when absent, permit browser encoding, and follow normal redirects. Never invent click values or replace {lpurl}. A placeholder alone is not an error. Missing/unusable inputs require review, not a substitute landing page.

# Stage 2 — Retrieve saved headline evidence

1. Follow the [audit runbook](../docs/run.md) and retrieve the explicitly named batch through the private capture-store client. Confirm its CSV mappings, capture profile, timestamps and suitability for the requested records. Keep capture and report credentials separate.
2. Review the saved screenshot, rendered text and capture metadata for each corresponding primary offer. Check cookie banners, rendered image text and selected product/device/speed/line views. A baseline can be adequate when it covers all necessary facts. A cookie banner only blocks comparison when it obscures necessary evidence that the saved text or another verified state cannot supply. Hidden content does not establish headline parity.
3. Record banner and primary-view coverage in the side review. Preserve an unavailable page or a necessary unreadable or uncaptured headline as Needs Review unless an independent confirmed difference establishes Mismatch. Redundant or excluded supporting details do not block agreement.
4. Use the capture refresh handoff for necessary gaps. Identify the original entry, required state and affected rows and request a new capture from the separate pipeline operator. Scout does not open live URLs or dispatch a capture job. Use a new, explicitly selected batch when it is ready. Persist current evidence and decisions without editing historical batches.

A location label alone does not block readable headline comparison. An unconfirmed page bottom alone is not a blocker.

# Stage 3 — Compare four headline fields

## 3.1 Establish correspondence
**Goal:** Compare recognizable headline experiences and detect changed/absent offers.

Use readable product/plan names, provider, headline purpose, and surrounding primary offer context. Do not require eligibility or disclosure evidence to establish correspondence. Layout, card order, and row labels alone are not deal differences.

Within a corresponding readable offer page/catalog, compare headline records and verify apparent omissions against its primary offers/tabs. A confirmed advertised offer missing from that readable counterpart is Mismatch. A clearly changed product in an identifiable corresponding headline offer is also Mismatch; do not force equal prices onto different products.

Use Needs Review when no comparable offer or experience can be identified, such as sales versus unrelated support/default blog content. A blocked or unreadable headline is not a confirmed absence.

## 3.2 Apply active specialists to shared evidence
**Goal:** Complete the requested comparison without supporting-term investigations.

| Check | Compare |
| --- | --- |
| Pricing | Displayed headline/card prices and billing units, associated basic product/plan, headline savings/reward/discount amounts. |
| Promo codes | Exact codes advertised in primary headline/card content; no redemption procedures. |
| Benefits | Headline rewards, devices, included benefits, discounts, and guarantees; no guarantee/eligibility terms. |
| Dates | Promotional duration/date range stated directly in a headline or offer card; no supporting timelines. |

Reuse shared captures and the same offer map. References are handoffs, not recursive audits. Preserve exact quotes and extract only in-scope fields; ignore excluded clauses even when the raw passage includes them. Do not compare eligibility, including inline eligibility. Retain headline product identity and units without validating who qualifies.

Use the manual capture refresh handoff for an uncertain headline value or apparent absence when needed. Continue independent checks after a difference. Unstated optional codes/durations do not need to be supplied or verified. Identical ambiguity/conflicting supporting text does not require commercial interpretation when headline agreement is readable.

# Stage 4 — Save and decide

## 4.1 Save traceable evidence
**Goal:** Preserve supported results without changing history.

Checkpoint captures and comparisons through configured durable storage. Retain original records, exact URLs, instruction/runner versions, selected headline views, extracted fields, supporting quotes/images, operation timings, and necessary headline gaps. Keep incidental warnings separate. Resume only compatible work. Disclose saving failures as operational issues, not website mismatches.

Never rewrite historical reports or relabel prior results automatically. A separately requested reassessment creates a new report/version, identifies its evidence date and new scope, and preserves the original.

## 4.2 Assign one result per record
**Goal:** Apply the PM's three results only to headline prices and offers.

1. **Mismatch:** A confirmed headline price or offer differs, or an advertised offer is absent from its corresponding readable page. Mention any additional unreadable headline content without hiding the confirmed difference.
2. **Needs Review:** No confirmed mismatch establishes the result, and a page is unavailable, necessary headline content cannot be read, or there is no identifiable comparable offer. Include missing/unusable input URLs here.
3. **Match:** Headline prices and offers agree, with readable evidence for the necessary headline fields.

Missing supporting terms, failed disclosures, eligibility differences, legal wording, and administrative detail never change these results. A disabled requirements check is not incomplete. No displayed code or duration on either readable counterpart is acceptable. Never assume unreadable headline content matches.

| Example | Result |
| --- | --- |
| Same headline prices/rewards; both disclosure buttons fail | Match |
| Same headline prices; AutoPay/trade-in eligibility wording differs | Match if other headline facts agree |
| $35/month versus $45/month, or per month versus per year | Mismatch |
| $100 reward versus $200 reward, or one headline code differs | Mismatch |
| Readable corresponding catalog omits a headline reward offer | Mismatch |
| Same "60-day money-back guarantee"; detailed guarantee terms unavailable | Match if other headline facts agree |
| A primary price image is unreadable after the bounded recheck | Needs Review |
| Tracking cannot render or leads to unrelated support | Needs Review |

# Stage 5 — Report

## 5.1 Reconcile and deliver
**Goal:** Return a complete, simple headline comparison.

Verify one result for every selected record and reconcile counts. Every active check must have a readable in-scope outcome or a specific necessary gap; a completed search finding no optional field is sufficient. Do not demand a fifth requirements result.

Use the report title **Headline pricing and offer comparison**, then counts and:

| Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason |
| --- | --- | --- | --- | --- | --- | --- |

Keep reasons specific: "$35/mo versus $45/mo," "Headline reward absent," or "Tracking price card unreadable." Do not use "eligibility unverified" or "disclosure blocked" as blockers. Keep technical evidence available without flooding the PM list. Label interrupted runs partial and account for unprocessed records as Needs Review.

Match means headline parity in the completed desktop view, not complete terms, commercial correctness, all-market coverage, or customer eligibility.
