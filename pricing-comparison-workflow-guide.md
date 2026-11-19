---
name: compare-pricing
description: Compare only displayed headline/offer-card prices, billing units, basic products/plans, and headline savings/reward/discount amounts on supplied vanity and tracking pages. Exclude eligibility, fine print, dormant content, and disclosure equality.
---

# Compare Headline Pricing

## Shared scope
**Goal:** Compare headline facts only.

Use [the master](coordinate-scout-audit/SKILL.md), [config](config/audit-config.json), and shared headline captures/offer map. For standalone use, collect only the same primary headline/card evidence and relevant product tabs. Report scope/title: **Headline pricing and offer comparison**.

Do not check eligibility, supporting requirements, disclosures, legal wording, redemption procedures, or administrative terms, including when excluded clauses appear inline. Never open terms, FAQs, or disclosure modals. Failed or missing supporting details are nonblocking. Never assume unreadable headline content matches. Preserve supplied URLs and capture security; ignore Creative ID and use Creative Name as context only.

## Stage 1 — Read primary prices
**Goal:** Capture advertised headline values rather than every dollar sign in page source.

Read headline and primary offer-card prices across the rendered page and relevant product tabs. Capture basic product/plan, displayed amount, currency, billing unit (month/year, per line/total), and headline modifiers such as "from" or "up to." Include headline savings, discounts, and rewards. Do not scan legal text, supporting fine print, hidden DOM, or terms to find additional required comparisons.

Read split dollar-sign/digit elements in their rendered context. Use visual evidence for primary price images when extraction misses them. Preserve original text/location and reuse shared evidence.

## Stage 2 — Compare corresponding headline fields
**Goal:** Find real changes in headline price or product.

Align basic products/plans and primary offer context. Compare amounts, units, and headline meaning. $35/month versus $45/month or per-line versus total differs. Different headline savings/rewards also differ; share those passages with Benefits.

Ignore typography, whitespace, DOM splits, duplicate UI copies, and equivalent $35/$35.00 formatting. Do not compare full-card literal strings: remove eligibility/administrative clauses from the evaluated fields. AutoPay, bundle, trade-in, new-customer, or other qualification differences do not affect this workflow's result. A basic product/plan change still matters; do not match unrelated products solely by amount.

## Stage 3 — Resolve headline gaps
**Goal:** Distinguish confirmed omission from unreadability.

Use the shared targeted recheck only for a necessary headline value, product association, or apparent missing primary offer. A readable corresponding catalog with an advertised headline offer missing is a difference. An unreadable card or inaccessible primary tab is not proof of absence. Terms/disclosure failures never require follow-up or block readable headline agreement.

## Stage 4 — Return evidence
**Goal:** Supply a scoped outcome to the master.

Return MATCH, MISMATCH, NO_DOLLAR_TEXT, or INCOMPLETE with source row, basic offer identity, both displayed values/units, original primary quotes, and evidence references. NO_DOLLAR_TEXT means no displayed primary dollar content in readable comparable views; it does not mean missing disclosures. Use INCOMPLETE only for necessary unreadable headline evidence, unavailable pages, or unresolved correspondence, not missing supporting details.
