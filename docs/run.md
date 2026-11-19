# Run Scout end to end

Scout audits saved evidence from the separate [capture pipeline](capture-pipeline.md). Use Node.js 24, Python 3.9 or newer, and Git. Begin with the [coordinator](../coordinate-scout-audit/SKILL.md) and the [four active guides](../README.md#four-active-comparison-guides).

## Select and verify a saved batch

Use an explicit batch ID. Report the capture window, comparison time, and age of each state used (entry timestamps only as a labeled fallback). Manifest createdAt is package time. No universal age limit is configured and the importer has no maximum-age option: Scout applies any user/approved limit during review, requests a separate refresh when needed, and never calls saved evidence a live check. Unknown age is not fresh evidence. A recent sample does not cover the full inventory. The first full batch and its timestamp are documented in the [capture handoff](CAPTURE_HANDOFF_2026_11_19.md).

Set `SCOUT_RUN` to a new private run directory outside Git and `SCOUT_BATCH` to the approved batch ID. The example uses an explicitly selected batch and five CSV rows; set APPROVED_BATCH_ID to the chosen compatible batch, not automatically to the historical example:

```sh
npm ci --prefix capture
npm ci --prefix reporting
npm ci --prefix web

SCOUT_BATCH=APPROVED_BATCH_ID
SCOUT_ROWS=2,16,20,77,111
umask 077
mkdir "$SCOUT_RUN"
vercel env run --environment development --project prj_XifLZUl5IZ7GE3UZ0krk4tXODxiy --scope centerfield -- \
  node capture/storage.mjs get "$SCOUT_BATCH" "$SCOUT_RUN/evidence" --rows "$SCOUT_ROWS"
python3 comparison/saved_captures.py "$SCOUT_RUN" --batch "$SCOUT_BATCH" --rows "$SCOUT_ROWS"
```

For a full audit, omit `--rows "$SCOUT_ROWS"` from both commands. Retrieval uses the dedicated capture store and verifies each selected artifact checksum. Preparation always validates the full batch mapping against the committed CSV, even when reviewing only a subset. It rejects a small batch for a full audit. It also verifies the runner hash and capture settings/profile and prints the batch capture window in UTC. Capture provenance remains separate from the current comparison instructions. Validation failures must stop preparation; do not fabricate checkpoints, silently select older evidence, or merge different batches. For each entry, the downloaded `evidence/entries/` directory has the capture record, state JSON, rendered text and available screenshots. Keep this directory private.

Capture credentials are used only by the host process. Use the existing Development OIDC connection, or the approved capture-store credential names in [capture-pipeline.md](capture-pipeline.md). Report publication uses its separate environment. Browser capture, viewer deployment, and schedules are separate operations.

## Review and compare

Use the coordinator to inspect only the default-page baseline, including scrolled content, and align corresponding headline offers. This is the agent review step. The code compares the resulting structured facts and preserves one result per selected CSV row. No handbook, eligibility check or raw card-text comparison is needed. Retain qualifiers like `from` and `up to`, product identity, reward types, billing units and exact promo codes. Record displayed promotional durations only. Record necessary unreadable primary content explicitly. An optional failed action can be ignored if the necessary offer facts are already readable.

Read saved rendered text first; inspect baseline screenshots only when needed to read headline facts. Alternate product tabs, Apple/Android views, speed/line selections, carousel slides, provider panels, eligibility and disclosures are excluded, even if saved. The current importer filters out interaction states. Missing alternate views cannot cause Needs Review.

Assess only necessary default-view information on each available side. In `coverage`, record `banner` as `clear`, `obstructed` or `uncertain`, `default_view` as `complete`, `incomplete` or `uncertain`, and a short `basis`. Use `clear` if the needed facts are readable, even if an irrelevant banner is present. A banner hiding necessary image text requires a gap. The default page includes scrolling; the initially selected product view is sufficient, with no requirement to open selectors.

Create a private `reviews.json` keyed by `vanity-entry/tracking-entry`; use `missing` for an unavailable input slot. Reuse a review for the same exact pair. This synthetic example shows both sides for one corresponding offer:

```json
{
  "scope_version": "default-view-headlines-v1",
  "pairs": {
    "entry-001/entry-002": {
      "correspondence": "corresponding",
      "vanity": {
        "finding": "Fiber Internet displays $35 per month.",
        "coverage": {"banner": "clear", "default_view": "complete", "basis": "Default-page headline cards are readable, including the scrolled content. Alternate views are excluded."},
        "evidence": [{"state": "attempt-1-baseline", "quotes": ["Fiber Internet $35/mo"]}],
        "offers": [{"id": "fiber", "state": "attempt-1-baseline", "fields": {"product": ["Fiber Internet"], "prices": ["$35/month"]}}]
      },
      "tracking": {
        "finding": "Fiber Internet displays $45 per month.",
        "coverage": {"banner": "clear", "default_view": "complete", "basis": "Default-page headline cards are readable, including the scrolled content. Alternate views are excluded."},
        "evidence": [{"state": "attempt-1-baseline", "quotes": ["Fiber Internet $45/mo"]}],
        "offers": [{"id": "fiber", "state": "attempt-1-baseline", "fields": {"product": ["Fiber Internet"], "prices": ["$45/month"]}}]
      }
    }
  }
}
```

- Use `product`, `prices`, `savings`, `benefits`, `promo_codes` and `durations` as applicable. Enter only canonical headline facts in `fields`. Text quotes must occur in the named visible state. With image-only primary text, transcribe the screenshot and mark the evidence item `"source": "image"`.
- Use the same offer ID for corresponding cards. A side with no offer and readable corresponding content can use `offers: []` with a cited state and explanation. If comparison is impossible because the pages are unrelated or their correspondence is uncertain, use `"correspondence": "unrelated"` or `"uncertain"` and a specific `reason`. Missing/unavailable sources become Needs Review without an invented review.
- Create fresh reviews under the new scope; do not copy previous broader reviews and delete their gaps. For both readable default pages with genuinely no headline offers, use `offers: []` and `no_offers_displayed: true` on both sides, with cited evidence and complete coverage. This produces **No offers displayed**, not Match. Empty extraction without that explicit assessment remains Needs Review.
- Use a side-level `gaps` list only for necessary default-view evidence gaps. Each gap must include `"scope": "default_view"` along with the five description fields. Describe `section_or_action`, `affected_headline_offer`, `necessary_headline_field_unreadable`, `why_existing_headline_evidence_is_insufficient`, and `affected_checks_and_records`. Use per-offer `unknown` for unreadable fields. Omit excluded and redundant details entirely.

```sh
python3 comparison/compare.py "$SCOUT_RUN" "$SCOUT_RUN/reviews.json"
python3 reporting/build.py "$SCOUT_RUN"
node reporting/verify.mjs "$SCOUT_RUN/published"
```

The builder rechecks the comparison against the evidence, packages a new report, and includes selected rows, captureSource provenance, batch and entry capture windows, timestamped screenshots and raw evidence archives. Include relative per-side age, profile, and freshness assessment in Scout’s delivered summary/private review log; these are not automatic freshness enforcement or relative-age viewer fields. The verifier renders it with the actual viewer code and checks each row, status, count and evidence filename/checksum. Spot-check headline facts against referenced rendered text and use screenshots only where primary facts require visual reading before approving publication. Keep those notes private. Record agent planning/review, transfers, assembly and final verification as separate intervals in the private run log when measured. Capture wall time is first capture-task start through last task finish, including gaps; active time is the union of task intervals. End-to-end starts when the audit is accepted and ends after report verification. Mark unmeasured intervals as unknown.

## Hand off refresh requests

For coverage gaps, use the report’s **Capture refresh handoff** document or `refresh_requests` in the comparison checkpoint. The document identifies the saved batch; each item identifies an entry, its navigation URL, affected rows and roles, required default-page content, and gap reason. Add the original supplied URL and freshness requirement from the verified mapping when handing it off. Freshness-only requests are recorded manually; the CLI generates requests for coverage/access gaps, not age violations. Give these items to the authorized operator of the separate capture pipeline. The handoff is a local record and does not contact or trigger a service. Report missing URLs or persistent certificate/routing errors to the source owner; do not repair supplied inputs or bypass TLS during comparison. The authorized operator uses the standalone capture CLI with an explicit row selection and an empty offer action plan. Current default-view captures scroll and may dismiss a known obstructing consent banner, but never navigate alternate offers. Select the resulting new batch explicitly and issue a new audit. Keep the original evidence batch and audit intact.

## Publish a new private report

Before a new-scope publication, ensure the existing protected viewer runs the updated `web/` source and supports **No offers displayed**. Updating Git does not deploy this viewer. If a deployment is needed, handle it as part of the authorized rollout and verify old reports still render.

For an independently authorized publish, use the existing approved private Vercel Blob store and existing Scout viewer. Set `BLOB_READ_WRITE_TOKEN` in the publisher's private environment and set `SCOUT_REPORT_ORIGIN` to the existing protected HTTPS origin. The viewer uses its existing project-managed Blob connection (`BLOB_STORE_ID` and Vercel-managed OIDC, or server-only `BLOB_READ_WRITE_TOKEN`). Keep Vercel Authentication enabled for the production domain and direct function routes. Do not add a new project or change authentication to run these commands.

```sh
node reporting/publish.mjs "$SCOUT_RUN/published"
node reporting/verify.mjs "$SCOUT_RUN/published" --signed-out
```

The publisher checks signed-out protection, keeps existing Blob objects immutable, verifies private read-back checksums, and writes `report.json` last. It verifies signed-out protection again and records a local publication checkpoint. The stable path is `/reports/<audit-id>`. Retry with the same verified package to resume a partial upload. Use a new audit ID for any different report.

Open the published link in an authorized browser, confirm the selected rows and totals, expand evidence panels and verify evidence links (open screenshots only when primary facts require visual reading), and refresh/reopen the URL. Record authorized browser verification separately from the anonymous check. Private Blob is independent of the capture VM. These steps use the existing viewer and do not deploy anything.

## Runtime follow-up

`default-view-headlines-v1` is enforced in the maintained capture and comparison code. New capture runs disable alternate offer navigation and reject nonempty action plans/reopen/followup mode. Comparison requires new scope-tagged reviews, default-view coverage and baseline evidence. Historical `headline-offers-v1` review/report support remains for reproducibility; do not rewrite past reports.

The recorded `capture` config object and profile remain unchanged for compatibility with immutable saved batches. Its richer interaction flags describe legacy capabilities; `comparison.scope_version` and `workflow.default_view_capture` override them for current captures. Existing batches can supply their baselines without recapture, provided all provenance and inventory validation passes.

`capture/package-batch.mjs` still requires a readable state with a screenshot to mark an entry captured. This separate packaging limitation is unchanged. Do not fabricate availability or bypass checksum verification. Capture saves screenshots as evidence; this is not layout comparison.

See [the full-sheet benchmark handoff](DEFAULT_VIEW_SCOPE_2026_11_19.md) for the same-batch comparison against the reported 78 Needs Review. Result changes require fresh evidence review; neither the number of resolved rows nor faster execution is assumed.

## Controlled checks

```sh
npm test --prefix capture
python3 -m unittest discover -s comparison -p '*_test.py'
node --test reporting/workflow_test.mjs
npm run check --prefix reporting
npm run check --prefix web
```

The browser fixture serves synthetic pages only. The workflow fixture builds and renders a synthetic report and tests publication with an in-memory private-store stand-in.
