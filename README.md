# Scout

**Headline pricing and offer comparison** of the default page views, including scrolling, from one selected saved capture batch.

## Two separate responsibilities

| Responsibility | Maintained implementation |
| --- | --- |
| Standalone capture pipeline | [capture/](capture/) loads the URL inventory, runs Playwright/Chromium in the authorized sandbox, and stores screenshots, rendered text, timestamps, row mappings, and failures in private Vercel Blob. |
| Scout comparison workflow | [Coordinator](coordinate-scout-audit/SKILL.md) selects/validates saved evidence, reviews headline facts, compares pairs, and produces the simple report. Normal audits do not browse campaign pages. |

Playwright is the separate pipeline's automation library, not an MCP tool or remotely callable agent. Implemented interfaces are documented host CLI commands. No recurring schedule or automatic comparison-triggered refresh is enabled.

Start with [docs/run.md](docs/run.md) for batch selection, validation, comparison/report interfaces, and the implemented interfaces and operational limits. Use [docs/capture-pipeline.md](docs/capture-pipeline.md) for a separately authorized capture/refresh, and [references/capture-execution.md](references/capture-execution.md) for pipeline execution rules.

## Normal audit: saved evidence first

1. Establish requested records and select an explicit/recorded compatible batch. Inspect its manifest, not just its name or creation date. A newer smoke batch does not replace a full batch.
2. Retrieve privately with checksum verification. Validate inventory/URL/row mappings, profile, capture timestamps, failures, and relevant saved headline states.
3. Report capture age/window, selected batch, and coverage gaps. No universal age limit is configured; use an explicit user/approved limit when supplied. Never call old evidence a live check.
4. Compare headline facts using the four guides below. Recheck saved states, not live pages. Never silently fill missing evidence with an older/different batch.
5. Request a separate refresh for necessary missing/unreadable or unacceptably old evidence. Do not claim a request launched a job. Continue unaffected rows and disclose unresolved gaps.
6. Return Match, Mismatch, Needs Review, or No offers displayed for every requested record with the evidence provenance.

## Headline-only rules

Compare displayed headline/card prices and billing units; basic products/plans; headline savings, rewards, discounts, benefits, and promo codes; and promotional durations directly stated in the headline/card. Use only saved baseline headline offers, including image text when needed. Read the default page through scrolling, not just its first viewport.

Exclude eligibility (even inline), detailed requirements, full disclosures, legal wording, redemption procedures, and administrative terms. Do not open terms, FAQs, supporting panels, or disclosure modals. Missing supporting details and failed disclosures are nonblocking. Never assume unreadable headline content matches.

Browser-device testing (desktop/mobile/tablet), cross-device parity and layout comparison are outside scope. Keep the existing single Chromium setting consistent for both URLs. Do not open or compare alternate Apple/Android tabs, plan/speed/line selections, carousel slides or provider detail panels. Only the initially selected view counts; missing alternate views cannot block Match. Compare saved rendered text first; screenshots are a fallback for necessary primary information. Missing mobile/tablet captures alone cannot cause Needs Review.

## Four active comparison guides

| Active check | Guide |
| --- | --- |
| Pricing | [pricing-comparison-workflow-guide.md](pricing-comparison-workflow-guide.md) |
| Promo codes | [compare-promo-codes.SKILL.md](compare-promo-codes.SKILL.md) |
| Benefits | [compare-benefits-inclusions.SKILL.md](compare-benefits-inclusions.SKILL.md) |
| Direct promotional durations | [compare-dates-durations.SKILL.md](compare-dates-durations.SKILL.md) |

The [requirements guide](compare-advertised-requirements.SKILL.md) remains disabled. Creative ID is unused and Creative Name is context only.

## Results

| Result | Meaning |
| --- | --- |
| Match | Displayed headline prices and offers agree in the readable default views. |
| Mismatch | A headline price/offer differs, or an advertised offer is absent from the corresponding readable page. |
| Needs Review | A page is unavailable, necessary default-view headline content is unreadable, or the pages cannot meaningfully be compared. |
| No offers displayed | Both readable default page views were explicitly checked and neither displays a headline offer. This is not a Match. |

Label every new report **Headline pricing and offer comparison**. Show batch ID, capture window/age, comparison time, and a short coverage note, then counts and **Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason**. Preserve original rows/duplicates. A captured/finished manifest is not a Match verdict or proof of exhaustive headline coverage.

## Maintained implementation

- [capture/storage.mjs](capture/storage.mjs) publishes immutable private batches, lists manifest paths, and retrieves checksum-verified evidence. [config/capture-store.json](config/capture-store.json) identifies the separate capture store and confirms scheduling is disabled.
- [comparison/compare.py](comparison/compare.py) compares reviewed headline facts; [reporting/](reporting/) assembles, verifies, and privately publishes reports; [web/](web/) contains the protected viewer source.
- [comparison/saved_captures.py](comparison/saved_captures.py) validates a selected stored batch and prepares the audit without browsing. Reports retain batch provenance, capture windows, timestamped evidence and manual refresh-handoff records. Scout reports relative evidence age and applies any requested age limit during review; no automatic freshness gate or refresh service is provided.
- A remaining screenshot-availability gate in capture packaging is documented under [runtime follow-up](docs/run.md#runtime-follow-up). The new scope changes current capture/comparison behavior; historical results remain unchanged.
- The existing [completion handoff](docs/CAPTURE_HANDOFF_2026_11_19.md) records the first full stored batch and verified limits. It is historical evidence, not a default batch selection or a scheduler.

Keep capture code/optimizations, the [CSV](data/scout-url-inventory.csv), [guarded pilot](config/pilot-config.json), exact supplied URLs, credential separation, TLS/authentication protections, and immutable history intact. Pipeline refresh and report publication are separate authorized operations. Never automatically relabel historical reports or silently substitute older evidence. No schedule or deployment is enabled by this repository update. See the [default-view rollout and full-sheet benchmark](docs/DEFAULT_VIEW_SCOPE_2026_11_19.md).
