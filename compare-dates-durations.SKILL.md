---
name: compare-dates-durations
description: Compare promotional durations and directly stated promotional timing only when displayed in a headline or primary offer card. Do not investigate supporting dates, eligibility/service-retention rules, guarantee details, billing administration, or disclosures.
---

# Compare Directly Advertised Promotional Durations

## Shared scope
**Goal:** Compare headline facts only.

Use [the master](coordinate-scout-audit/SKILL.md), [config](config/audit-config.json), and the selected validated saved batch/offer map. Read already captured primary headline/card and product-tab states; normal audits do not browse, click, or start Playwright. A recheck means inspecting saved evidence in that batch. Request a separate refresh for missing necessary headline states; never silently substitute older evidence. Report capture age/gaps through the master. Report scope/title: **Headline pricing and offer comparison**.

Do not check eligibility, supporting requirements, disclosures, legal wording, redemption procedures, or administrative terms, including when excluded clauses appear inline. Never open terms, FAQs, or disclosure modals. Failed or missing supporting details are nonblocking. Never assume unreadable headline content matches. Preserve supplied URLs and capture security; ignore Creative ID and use Creative Name as context only.

## Stage 1 — Select primary timing
**Goal:** Read only duration/timing presented as part of the headline offer.

Examples: "$35/mo for 12 months," "5-year price lock," "3 months free," "60-day money-back guarantee," or an explicit promotion date/range directly in the primary headline/card. Read relevant product tabs when needed. Do not require a duration or date to exist.

Exclude dates/periods found only in supporting text, FAQs, terms, disclosure modals, or hidden DOM. Exclude eligibility/service-retention rules, installment/credit schedules outside primary promotional copy, AutoPay activation, first-credit processing, redemption deadlines, and fulfillment estimates. "$35/month" alone is a billing unit; "$420/year savings" alone is annualized savings, not a one-year promotion.

## Stage 2 — Preserve and compare the primary statement
**Goal:** Compare the same headline duration for the same offer.

Retain the basic offer, exact primary text, duration/range, unit, and modifiers such as "up to" or "for." Compare like roles: price lock versus price lock, guarantee period versus guarantee period. Preserve stated calendar boundaries without inventing years/timezones. Identical displayed date text can agree without interpreting its commercial validity.

Allow harmless abbreviations and equivalent one-year/12-month wording for the same headline role. Do not automatically equate 90 days with three calendar months or billing cycles with calendar months. Never seek details to complete missing legal boundaries or starting events.

## Stage 3 — Return scoped timing results
**Goal:** Avoid a timing review when only supporting details are missing.

Return MATCH_IN_CHECKED_CONTENT, TIMING_DIFFERENCE, NOT_STATED, or INCOMPLETE with original primary passages, basic offer, preserved timing fields, and evidence. Neither readable headline/card stating a duration is NOT_STATED, not a blocker. A directly advertised one-sided duration is a headline difference. A failed guarantee/disclosure detail is irrelevant. Use the shared recheck only for unreadable necessary primary timing or unresolved headline correspondence.
