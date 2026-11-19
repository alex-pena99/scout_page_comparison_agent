# Scout — Pricing and Offers

Scout compares the advertised pricing and offers on vanity and tracking pages. The PM asks for an audit and receives **Match**, **Mismatch**, or **Needs Review**, with a short reason.

## Start here

**Every audit starts with [coordinate-scout-audit/SKILL.md](coordinate-scout-audit/SKILL.md).** It is the master protocol: Start → Prepare → Capture → Compare → Save and decide → Report.

Read the master, [capture configuration](config/audit-config.json), and the five specialists from the run's recorded commit. Share captures and offer associations; do not launch five independent browsing workflows.

| Check | Guide |
| --- | --- |
| Pricing | [pricing-comparison-workflow-guide.md](pricing-comparison-workflow-guide.md) |
| Promo codes | [compare-promo-codes.SKILL.md](compare-promo-codes.SKILL.md) |
| Benefits | [compare-benefits-inclusions.SKILL.md](compare-benefits-inclusions.SKILL.md) |
| Dates | [compare-dates-durations.SKILL.md](compare-dates-durations.SKILL.md) |
| Material requirements | [compare-advertised-requirements.SKILL.md](compare-advertised-requirements.SKILL.md) |

## What matters

Compare advertised dollar values, fees, savings, rewards, promo codes, included benefits, offer dates/promotional periods, and qualifications that materially change the deal. Preserve relevant billing units, "up to," bundles, AutoPay/paperless price conditions, eligible plans, and trade-ins.

This is **cross-page parity**, not a legal audit or certification of commercial correctness. Exclude disclosure wording/completeness, internal-consistency investigations, AutoPay enrollment/activation/start windows, first-credit processing, document/submission procedures, administrative redemption deadlines, and delivery estimates.

- $35 versus $45, a $100 versus $200 reward, or a genuinely one-sided benefit: **Mismatch**.
- Same conflicting disclosure passages on both pages: no parity blocker; optional note only.
- Discount starts within 2 versus 3 bills: excluded mechanics; no result impact.
- One offer requires AutoPay/bundling for the price and its counterpart does not: compare the material qualification.
- Formatting, layout, and equivalent paraphrases are not changed deals.

## Capture only what the comparison needs

Read the rendered page and distinct offer-bearing views, scrolling as needed. Open details, panels, FAQs, or frames when their context suggests additional offers or they are needed to understand a material price/offer fact. Reuse sufficient equivalent evidence instead of requiring every redundant panel to open.

A timeout alone is not a reason for Needs Review. Classify it:
- Excluded or redundant content with sufficient captured offer evidence: nonblocking technical note.
- Necessary offer evidence or a plausibly distinct offer remains unavailable: a specific blocking gap.

Do not dismiss unread content merely because capture failed. Name the section, why it matters, and the evidence still missing. Apply gaps only to dependent records/checks.

Desktop defaults remain Chromium at 1440 x 900, en-US, America/New_York, equivalent region/settings, isolated contexts, and four concurrent captures. Allow one transient retry and one shared targeted recheck per distinct need. Provisional limits remain 30s navigation, 15s readiness, 10s interaction, and 180s total per entry. Mobile/tablet, ZIP/address entry, checkout, forms, and unrelated navigation remain outside V1. A timeout affects the result only after relevance assessment.

## Inputs and pilot

Use [data/scout-url-inventory.csv](data/scout-url-inventory.csv): **Account, Vanity URL, Tracking URL, Position, Creative Name**. Preserve all records. Ignore Creative ID in legacy inputs. Creative Name is supporting context, never a campaign-validation gate.

Keep tracking URLs and every parameter, including c=, unchanged. For navigation, trim surrounding whitespace, add a missing https:// scheme, permit browser encoding, and follow redirects. Preserve placeholders; do not invent click values or substitute {lpurl}. A placeholder is not an error. These captures observe supplied templates, not simulated resolved ad clicks.

- **Full audit:** No filter means every inventory record at the run's recorded revision.
- **Explicit development pilot:** [config/pilot-config.json](config/pilot-config.json) selects rows 2, 16, 17, 100, and 111 (header is row 1) from its pinned inventory. Verify the hash and exact five-column guards. Abort invalid selection before capture; never fall back to all 135 records.
- Record both instruction and pilot-inventory revisions. CSV and pilot selection are unchanged by this scope revision.

## PM report

| Result | Meaning |
| --- | --- |
| Match | In-scope advertised pricing and offers agree with sufficient evidence and no necessary unresolved comparison. |
| Mismatch | At least one confirmed in-scope difference; mention other necessary gaps if present. |
| Needs Review | Inputs, unrelated destinations, offer association, or necessary missing evidence prevent comparison and no confirmed mismatch establishes the result. |

Return counts and **Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason**. Explain what already agrees and precisely what remains unverified. Keep optional notes and raw evidence available for follow-up. Match is limited to this desktop advertised-pricing/offer scope, not every page detail.

## Runtime integration

This repository supplies instructions, configuration, and inventory, not a capture runner. External runners/report aggregators must implement config version 3: classify relevance before converting capture warnings or specialist statuses into a public result. Do not automatically carry forward old blanket timeout/internal-contradiction blockers. Reports already saved are historical; rerun using the updated instructions to reassess them.

The intended dedicated runtime uses Playwright/Chromium, such as in Vercel Sandbox, plus durable progress/evidence storage. Configuration does not enforce behavior until the runner uses it. No campaign audit was executed by editing these files.

## Suggested agent instruction

> Start with coordinate-scout-audit/SKILL.md. Compare advertised pricing and offers using the shared captures and five focused guides. Exclude disclosure perfection and enrollment mechanics. Return every requested record as Match, Mismatch, or Needs Review; only necessary unresolved offer evidence can block agreement.
