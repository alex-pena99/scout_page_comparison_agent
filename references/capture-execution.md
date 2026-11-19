# Default-view capture execution

This contract applies to `default-view-headlines-v1`. The maintained runner is in [capture/](../capture/); saved-evidence audits do not launch it. Use [docs/capture-pipeline.md](../docs/capture-pipeline.md) only for a separately authorized capture task.

## 1. Capture the default page
**Goal:** Save the pricing and headline offers a visitor sees without changing offer selections.

- Preserve supplied URLs, tracking placeholders and redirects. Use the existing Chromium profile and a fresh isolated context per unique entry URL.
- Navigate, wait for usable rendered content, scroll to collect lazy-loaded default-page content, and return to the top. Save baseline rendered text, screenshot, metadata, timestamps and failures.
- The initially selected product view is sufficient. Do not open alternate tabs, change plan/speed/line selectors, advance offer carousels or open provider panels. Do not open terms, disclosures, FAQs or supporting details.
- The runner disables automatic offer discovery and rejects nonempty action plans, reopen and followup mode under this scope. A safe known consent dismissal is still permitted; verify it closes before reading the default view. No force clicks or access-control bypass.
- Record an obstructing banner if necessary headline information remains unreadable. If the required headline facts remain readable, the banner is not a comparison blocker.

## 2. Keep execution efficient
**Goal:** Avoid idle workers and repeated visits.

- Use a continuously filled queue with at most four active capture contexts, including retries. Start ready work as a slot frees; do not use fixed batch barriers.
- Reuse exact entry URLs across rows. Keep different supplied entry URLs isolated even if they redirect to the same destination.
- Save a valid baseline once. Retain existing navigation/readiness/interaction/entry deadlines and bounded transient retries. Do not add alternate-view rechecks.
- Preserve attempts and evidence. Never replace a failed fresh capture with older evidence silently.

## 3. Record useful coverage
**Goal:** Distinguish visible evidence gaps from excluded work.

- Record scroll completion separately from headline readability. A full-page screenshot does not guarantee all lazy content loaded; lack of a bottom confirmation is not automatically a blocker.
- Compare only displayed default-page headlines/cards, including necessary promotional image text. Hidden loaded content and alternate views are excluded even if they appear in source data.
- Failed page access and unreadable necessary default headlines remain real gaps. Missing disclosures, eligibility rules and alternate views do not.
- Both readable pages genuinely showing no headline offers can produce **No offers displayed** after explicit review. Capture completion alone does not determine any verdict.

## 4. Preserve provenance and timing
**Goal:** Make results traceable and speed measurements honest.

Record instruction revision, runner revision/hash, config version, inventory revision, exact selected rows/URLs, capture scope, entry/visit IDs, capture timestamps and outcomes. Keep private credentials out of artifacts and logs.

Record queue wait, context setup, navigation, readiness, scrolling, extraction, consent dismissal when performed, screenshots, writes and teardown. Record review, retrieval, report assembly, publication and verification separately. Use monotonic elapsed durations and UTC timestamps; do not add overlapping durations and call them wall time.

Capture wall time runs from first entry start to last finish, including capture-stage gaps. Audit elapsed time runs from accepted audit start through verification. A saved-evidence audit excludes the earlier capture run; report that explicitly. Unknown timers are unknown, not zero.

## 5. Hand off immutable saved evidence
**Goal:** Keep capture and comparison separate.

Publish the completed private manifest last, after artifact verification. Preserve original row/entry mappings, source revisions, timestamps, failures and raw evidence. Comparison uses one explicitly selected, compatible batch and a separate report ID. Report actual evidence age; no automatic freshness gate, recurring schedule or comparison-triggered refresh is enabled.

The existing `capture` config object retains its historical profile/capabilities so old batches still validate. The new `comparison.scope_version` overrides legacy interaction capabilities at runtime. Richer tab/selector code and its tests remain for historical-scope reproducibility, not as current completeness requirements.

## 6. Verify behavior and benchmark
**Goal:** Demonstrate scope enforcement without hiding remaining gaps.

Controlled tests must confirm:
- Four-worker queue behavior and isolation remain intact.
- A default-view run captures the baseline and scrolls, but never visits alternate offer tabs even when discovery was requested.
- Alternate action plans/reopen/followups are rejected under the new scope.
- Comparison rejects interaction-state evidence, older coverage schemas and unscoped reviews for new audits.
- Readable default headline agreement passes; visible differences stay Mismatch; unavailable/unreadable necessary defaults stay Needs Review.
- Both confirmed empty default views produce the separate No offers displayed status; empty extraction alone does not.
- The viewer and package verifier handle all four statuses, preserve totals and still support historical reports.

For the currently requested full-sheet test, follow [the benchmark handoff](../docs/DEFAULT_VIEW_SCOPE_2026_11_19.md). Use the exact prior full batch and fresh scoped review. Preserve historical results, and explain each transition. Narrowing scope is not an equivalent-coverage speed improvement. Keep earlier 25-record selections and pilot guards intact; use them only when specifically requested.
