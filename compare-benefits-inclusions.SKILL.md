---
name: compare-benefits-inclusions
description: Compare only headline savings, rewards, discounts, devices, included benefits, and guarantees displayed in default-view primary offer cards. Exclude eligibility, full benefit/guarantee terms, disclosures, and fulfillment procedures.
---

# Compare Headline Offers and Benefits

## Shared scope
**Goal:** Compare headline facts only.

Use [the master](coordinate-scout-audit/SKILL.md), [config](config/audit-config.json), and the selected validated saved batch/offer map. Read only saved default-page headline/card evidence, including scrolling; normal audits do not browse, click, or start Playwright. A recheck means inspecting saved evidence in that batch. Request a separate refresh only for unavailable or unreadable necessary default-view content; never silently substitute older evidence. Report capture age/gaps through the master. Report scope/title: **Headline pricing and offer comparison**.

Compare saved rendered text first; use screenshots only when needed to read primary offer information, such as an image-only price or an ambiguous extracted code. Do not compare layout or require separate desktop/mobile/tablet runs or cross-device parity. Missing mobile/tablet captures alone never cause Needs Review. Only the initially selected product view is in scope. Do not require or compare alternate Apple/Android tabs, plan/speed/line selections, carousel slides or provider detail panels, even if saved. Missing alternate views never create a gap.

Do not check eligibility, supporting requirements, disclosures, legal wording, redemption procedures, or administrative terms, including when excluded clauses appear inline. Never open terms, FAQs, or disclosure modals. Failed or missing supporting details are nonblocking. Never assume unreadable headline content matches. Preserve supplied URLs and capture security; ignore Creative ID and use Creative Name as context only.

## Stage 1 — Identify primary offers
**Goal:** Record what the headline/card advertises.

Read basic product/plan names and headline rewards, savings, discounts, free/discounted devices, equipment, installation, features, subscriptions, or guarantees. Use the default page, including scrolling. Do not navigate to additional offer views. Include primary promotional image text when necessary.

Preserve headline benefit identity, model, quantity, reward form, and "up to"/"free"/"on us" wording. A reward card and bill credit differ. Do not investigate eligibility, trade-in conditions, fulfillment estimates, or guarantee terms. Ignore excluded qualifiers even when written beside the headline benefit.

## Stage 2 — Compare corresponding headline offers
**Goal:** Detect a different or absent advertised offer.

Use provider, basic product/plan, and primary offer context, not layout or card order alone. Compare item/form, quantity, headline benefits, and basic product. Route headline dollar amounts to Pricing and directly stated promotional/guarantee duration to Dates using the same evidence.

A changed headline benefit or an offer absent from its corresponding readable page is a difference. Unrelated sales/support experiences with no identifiable comparable offer require review. A primary offer that cannot be read is not a confirmed omission. "60-day money-back guarantee" on both sides agrees without opening guarantee terms.

## Stage 3 — Resolve and return
**Goal:** Stop once headline comparison is supported.

Request a shared recheck only for missing/unreadable primary content or a genuine association question. Do not complete a benefit by opening a disclosure. Return MATCH_IN_CHECKED_CONTENT, BENEFIT_DIFFERENCE, NO_BENEFIT_FOUND, or INCOMPLETE with both primary claims, product/benefit identity, and evidence. Missing supporting terms or a failed detail interaction cannot block agreement.
