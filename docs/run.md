# Run Scout end to end

Use an authorized desktop Chromium sandbox in a single region. Install Node.js 24, Python 3.9 or newer, and Git. Get the maintained source from this repository and start with the [coordinator](../coordinate-scout-audit/SKILL.md), [config](../config/audit-config.json), and [execution reference](../references/capture-execution.md). Use the [four active guides](../README.md#four-active-comparison-guides) to review evidence. The requirements guide is inactive.

## Install and pin a selection

From the repository root:

```sh
npm ci --prefix capture
npm ci --prefix reporting
npm ci --prefix web
python3 capture/prepare.py --run-dir "$SCOUT_RUN" --region "$SCOUT_REGION"
```

Set the shell variables `SCOUT_RUN` to a new directory in approved private storage and `SCOUT_REGION` to the actual browser execution region. The default selection is the full inventory. Add `--rows 2,3,4,5,6` for an explicit selection or `--pilot` for the separately pinned and guarded pilot. Fetch the pinned inventory revision if a shallow checkout lacks it. Use `--instructions REV` and `--runner REV` to select commits explicitly. They default to the checked-out commit. The tool checks that the local runner matches its pinned Git version.

Review `input.json` before opening pages. This is the exact selection and record-to-entry map, with captured provenance and the unaltered CSV fields. Navigation may trim surrounding whitespace and add HTTPS. Tracking placeholders, query parameters and order remain supplied. A missing or unusable URL is recorded for its row.

## Capture and checkpoint

```sh
node capture/capture.cjs "$SCOUT_RUN/input.json" "$SCOUT_RUN/offer-plan.json" "$SCOUT_RUN/evidence"
```

Use the provisioned Chromium on the existing Vercel Sandbox. If needed, set `SCOUT_CHROMIUM_PATH` to that binary. In its absence, the runner uses the pinned Linux Chromium dependency. In the sandbox, install the pinned `capture/` dependencies and transfer only the source and private runtime inputs needed for capture. Run the same command with sandbox-local paths. Copy captures and checkpoints back to approved durable private storage as work completes and before the sandbox can expire. Keep review and publisher credentials out of the capture VM.

The runner starts each unique entry once, delivers results to every mapped CSV record, and releases the slot to the next ready entry. It records queue events, per-visit timing, baseline reuse, scroll coverage and action outcomes. Re-run the same initial command and plan against the same output to resume completed entries. An interrupted entry without a completed capture checkpoint may need to run again. Use one runner process per audit.

After inspecting rendered screenshots and text, use the saved control metadata to plan only missing necessary headline views. The planner lists candidates and validates a drafted plan:

```sh
node capture/plan.cjs "$SCOUT_RUN/input.json" "$SCOUT_RUN/evidence"
node capture/plan.cjs "$SCOUT_RUN/input.json" "$SCOUT_RUN/evidence" "$SCOUT_RUN/followup.json"
node capture/capture.cjs "$SCOUT_RUN/input.json" "$SCOUT_RUN/followup.json" "$SCOUT_RUN/evidence" --reopen
```

When necessary controls are already known, plan them in `offer-plan.json` before initial capture to reuse the same page. For agent decisions arriving during capture, create a private inbox directory and pass `--followups DIRECTORY` to the initial runner. The agent can inspect `checkpoint-baseline.json` and its saved artifacts and atomically rename a reviewed action array to `DIRECTORY/entry-001.json`. A ready follow-up then shares the active worker pool. Work arriving after the runner exits uses `--reopen`. Reopening revalidates the baseline and stays within the same cumulative entry deadline and configured recheck budget. Put all necessary actions for an entry in its single reviewed follow-up plan.

A plan maps capture entry keys to ordered arrays. This synthetic example expects an explicitly selected device view and associates the verification text with its primary card section:

```json
{
  "entry-001": [
    {
      "id": "android",
      "surface": "product-tab",
      "label": "Android",
      "button": true,
      "reason": "Inspect the Android primary device offer",
      "expected": {"selected": true, "scope": "#android-offers", "text": "Galaxy"}
    }
  ]
}
```

Use `product-tab`, `headline-selector`, or `headline-carousel`. Use the minimum necessary actions. Use exact visible control labels or an inspected selector, and require selected state and associated content for tabs and selectors. A carousel needs a primary card scope and can have a bounded `carousel` count. A known next state should have an observable text or visible-card expectation. For dependent actions use `dependsOn` with an earlier action ID. Legacy detail plans must be discarded. No terms, FAQs, disclosures, eligibility checks, unrelated actions or access bypasses are allowed.

## Review and compare

Use the coordinator to inspect actual state evidence and align corresponding primary offers. This is the agent review step. The code compares the resulting structured facts and preserves one result per selected CSV row. No handbook, eligibility check or raw card-text comparison is needed. Retain qualifiers like `from` and `up to`, product identity, reward types, billing units and exact promo codes. Record displayed promotional durations only. Record necessary unreadable primary content explicitly. An optional failed action can be ignored if the necessary offer facts are already readable.

Create a private `reviews.json` keyed by `vanity-entry/tracking-entry`; use `missing` for an unavailable input slot. Reuse a review for the same exact pair. This synthetic example shows both sides for one corresponding offer:

```json
{
  "pairs": {
    "entry-001/entry-002": {
      "correspondence": "corresponding",
      "vanity": {
        "finding": "Fiber Internet displays $35 per month.",
        "evidence": [{"state": "attempt-1-baseline", "quotes": ["Fiber Internet $35/mo"]}],
        "offers": [{"id": "fiber", "state": "attempt-1-baseline", "fields": {"product": ["Fiber Internet"], "prices": ["$35/month"]}}]
      },
      "tracking": {
        "finding": "Fiber Internet displays $45 per month.",
        "evidence": [{"state": "attempt-1-baseline", "quotes": ["Fiber Internet $45/mo"]}],
        "offers": [{"id": "fiber", "state": "attempt-1-baseline", "fields": {"product": ["Fiber Internet"], "prices": ["$45/month"]}}]
      }
    }
  }
}
```

- Use `product`, `prices`, `savings`, `benefits`, `promo_codes` and `durations` as applicable. Enter only canonical headline facts in `fields`. Text quotes must occur in the named visible state. With image-only primary text, transcribe the screenshot and mark the evidence item `"source": "image"`.
- Use the same offer ID for corresponding cards. A side with no offer and readable corresponding content can use `offers: []` with a cited state and explanation. If comparison is impossible because the pages are unrelated or their correspondence is uncertain, use `"correspondence": "unrelated"` or `"uncertain"` and a specific `reason`. Missing/unavailable sources become Needs Review without an invented review.
- Use a side-level `gaps` list for necessary evidence gaps. Describe `section_or_action`, `affected_headline_offer`, `necessary_headline_field_unreadable`, `why_existing_headline_evidence_is_insufficient`, and `affected_checks_and_records`. Use per-offer `unknown` for unreadable fields. Omit excluded and redundant details entirely.

```sh
python3 comparison/compare.py "$SCOUT_RUN" "$SCOUT_RUN/reviews.json"
python3 reporting/build.py "$SCOUT_RUN"
node reporting/verify.mjs "$SCOUT_RUN/published"
```

The builder rechecks the comparison against the evidence, packages a new report, and includes selected rows, capture metadata, screenshots and raw evidence archives. The verifier renders it with the actual viewer code and checks each row, status, count and evidence filename/checksum. Spot-check headline facts against the referenced screenshots and captures before approving publication. Keep those notes private. Record agent planning/review, transfers, assembly and final verification as separate intervals in the private run log when measured. Capture wall time is first capture-task start through last task finish, including gaps; active time is the union of task intervals. End-to-end starts when the audit is accepted and ends after report verification. Mark unmeasured intervals as unknown.

## Publish a new private report

For an independently authorized publish, use the existing approved private Vercel Blob store and existing Scout viewer. Set `BLOB_READ_WRITE_TOKEN` in the publisher's private environment and set `SCOUT_REPORT_ORIGIN` to the existing protected HTTPS origin. The viewer uses its existing project-managed Blob connection (`BLOB_STORE_ID` and Vercel-managed OIDC, or server-only `BLOB_READ_WRITE_TOKEN`). Keep Vercel Authentication enabled for the production domain and direct function routes. Do not add a new project or change authentication to run these commands.

```sh
node reporting/publish.mjs "$SCOUT_RUN/published"
node reporting/verify.mjs "$SCOUT_RUN/published" --signed-out
```

The publisher checks signed-out protection, keeps existing Blob objects immutable, verifies private read-back checksums, and writes `report.json` last. It verifies signed-out protection again and records a local publication checkpoint. The stable path is `/reports/<audit-id>`. Retry with the same verified package to resume a partial upload. Use a new audit ID for any different report.

Open the published link in an authorized browser, confirm the selected rows and totals, expand evidence panels, open screenshots and evidence links, and refresh/reopen the URL. Record authorized browser verification separately from the anonymous check. Private Blob is independent of the capture VM. These steps use the existing viewer and do not deploy anything.

## Controlled checks

```sh
npm test --prefix capture
python3 -m unittest discover -s comparison -p '*_test.py'
node --test reporting/workflow_test.mjs
npm run check --prefix reporting
npm run check --prefix web
```

The browser fixture serves synthetic pages only. The workflow fixture builds and renders a synthetic report and tests publication with an in-memory private-store stand-in.
