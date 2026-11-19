# Default-view scope rollout and full-sheet test — November 19, 2026

## Approved outcome

Scout compares only pricing and simple offer headlines on each default page, including scrolling. No alternate product tabs, speed/line selections, carousel navigation, provider panels, eligibility or disclosures are required. Basic product identity and headline qualifiers still matter. Necessary unreadable default information and page-access failures remain review cases.

New scope: `default-view-headlines-v1`. New explicit status: **No offers displayed** when both readable default views are confirmed to have no offers. This is separate from Match. Fresh review is required; do not convert historical results automatically.

## Repository implementation

- Coordinator, four active guides, config and runbook describe the reduced scope.
- Saved-batch import filters out alternate states; comparison requires new scope-tagged reviews and default-view coverage. Necessary gaps must explicitly belong to the default view.
- The maintained capture runner disables alternate navigation for this scope and rejects action/reopen/followup plans, while retaining scrolling and safe known consent dismissal. Historical capture capabilities and immutable provenance remain intact.
- Report assembly, package verification and viewer source support the fourth status. Git updates do not deploy the protected viewer.
- No CSV/source URL changes, live audit, capture, report upload, deployment or schedule is part of this repository update.

The comparison engine validates structure, citations and counts, but still relies on the reviewing agent to extract the correct headline meaning and verify genuine absence. Scope tags are not independent factual verification.

## Controlled full-sheet test in the existing Vercel Sandbox

1. Pull and record the updated repository revision. Use a new audit ID/directory; preserve all prior reports.
2. Retrieve and validate **scout-captures-20261119210302267-7bb7bd4** using the maintained commands in [run.md](run.md). Omit row filters to select all **135 records / 236 entry URLs** in that batch. Stop and explain any incompatible inventory/provenance; do not silently select a different batch or edit source data.
3. Create a fresh `default-view-headlines-v1` review from baseline evidence only, including scrolled content. Reuse identical pairs. Do not reuse previous coverage conclusions, fill gaps from another batch, recapture or browse live campaign URLs.
4. Apply the four results. Excluded alternate views cannot create gaps. Missing sources, unreadable necessary defaults and genuinely incomparable pages still require review. Both empty readable default pages require explicit absence evidence before No offers displayed.
5. Build/verify a new report. Before publication, ensure the existing protected viewer supports all four statuses; deploy its updated source if necessary as part of the authorized sandbox rollout. Preserve authentication, private storage and older reports.
6. Publish and verify all 135 rows, reconciled counts, signed-in evidence access (including a screenshot) and signed-out protection. Preserve the selected capture window and label results as captured.
7. Compare against the user-reported prior saved audit: **42 Match / 15 Mismatch / 78 Needs Review**, **7m 53s** total. Prior report: https://scout-pm-reports.vercel.app/reports/scout-saved-20261119-214320-419633. Inspect its actual row results if accessible; do not invent transitions from counts alone. List every changed row, old/new status and evidence-supported reason. Separate resolved default-view comparisons from No offers displayed; neither means broader coverage was achieved.
8. Report retrieval, review, comparison, assembly, publication and verification times with overlap explained. There is no new capture time. Disclose the narrower scope when comparing elapsed times. Do not promise a lower Needs Review count before seeing the results.

## Verification for this change

Run the Python comparison tests, synthetic reporting/publication fixtures, controlled local Chromium fixtures and syntax checks. Validate compatibility with the selected stored batch without performing the full audit here. Record actual outcomes in the completion handoff; do not infer deployed behavior from local checks.

Verified locally after implementation: **17 Python comparison tests, 5 capture tests (including local Chromium fixtures), and 3 synthetic reporting/publication tests passed**, plus capture/reporting/viewer syntax checks and `git diff --check`. Explicit, guarded-pilot and full-inventory selection checks passed without opening inventory URLs.

The existing local package for `scout-captures-20261119210302267-7bb7bd4` passed current-revision provenance/artifact validation for **135 rows / 236 entries**. The new importer exposed **212 readable baseline states, zero alternate states**, retaining **24 unavailable entries**. This verified compatibility only: no live capture, full comparison, report publication or viewer deployment was performed here. The full-sheet result counts remain pending the sandbox test.
