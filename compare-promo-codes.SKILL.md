---
name: compare-promo-codes
description: Compare exact promo codes displayed in primary headlines or offer cards. Do not seek codes in terms, FAQs, disclosure modals, redemption procedures, or hidden loaded content.
---

# Compare Headline Promo Codes

## Shared scope
**Goal:** Compare headline facts only.

Use [the master](coordinate-scout-audit/SKILL.md), [config](config/audit-config.json), and shared headline captures/offer map. For standalone use, collect only the same primary headline/card evidence and relevant product tabs. Report scope/title: **Headline pricing and offer comparison**.

Do not check eligibility, supporting requirements, disclosures, legal wording, redemption procedures, or administrative terms, including when excluded clauses appear inline. Never open terms, FAQs, or disclosure modals. Failed or missing supporting details are nonblocking. Never assume unreadable headline content matches. Preserve supplied URLs and capture security; ignore Creative ID and use Creative Name as context only.

## Stage 1 — Find displayed codes
**Goal:** Capture promo codes that are part of the primary advertised offer.

Read headlines/cards and relevant product tabs for clearly advertised codes or "use code" text. Record exact capitalization, punctuation, and characters, associated basic product/benefit, original quote, and location. Visually inspect a primary image containing a code when needed; preserve uncertain characters rather than guessing O/0 or I/1.

Exclude URL parameters, model numbers, unsupported code-shaped strings, fine print, and hidden references. Do not open details, FAQs, or terms to find a code, and do not test redemption or compare redemption procedures.

## Stage 2 — Compare headline code sets
**Goal:** Find different or absent advertised codes for corresponding offers.

Compare all clearly displayed headline codes associated with the same primary offer, preserving case. A different or one-sided headline code is a difference after the corresponding readable offer content is checked. A blocked disclosure that might contain another code is outside scope and nonblocking.

## Stage 3 — Resolve and return
**Goal:** Keep genuine unreadability separate from optional supporting data.

Use one shared targeted recheck only when necessary primary code characters/content cannot be read or correspondence is unclear. Return MATCH, MISMATCH, NO_CODE_FOUND, or INCOMPLETE with exact primary code values, offer, quotes/images, and evidence. Neither readable offer displaying a headline code is NO_CODE_FOUND and acceptable. Never require terms or redemption instructions to complete a code comparison.
