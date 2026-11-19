---
name: compare-advertised-requirements
description: Disabled legacy Scout requirements guide. Eligibility, qualifications, detailed requirements, and supporting terms are outside the headline pricing and offer comparison workflow. Do not run this check or require a requirements result.
---

# Requirements Check — Disabled

## Goal

Keep the active workflow limited to **Headline pricing and offer comparison**.

Do not inspect or compare eligibility, AutoPay/paperless conditions, bundling qualifications, trade-ins, customer status, plan/line-count requirements, verification, redemption procedures, administrative terms, or legal wording. This applies even when those clauses appear inline with a primary offer. Basic product/plan names and billing units are still compared by Pricing and Benefits without validating who qualifies.

Do not open terms, FAQs, supporting-detail panels, or disclosure modals. Missing qualifications, failed disclosures, and the absence of a requirements result cannot cause Needs Review or Mismatch. If an older runner invokes this file, skip the check as NOT_APPLICABLE (internal only), return control to [the master](coordinate-scout-audit/SKILL.md), and do not emit a fifth public finding.

The file remains at its old path for compatibility; requirements checking is removed from the active configuration. Four active checks handle headline pricing, codes, benefits, and directly stated promotional durations. Never reinterpret an unreadable headline as a match. Preserve prior reports unchanged.
