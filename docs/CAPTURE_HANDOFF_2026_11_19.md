# Standalone capture pipeline — first full batch

Status: implemented; full inventory captured and uploaded to private Vercel Blob.
This is capture infrastructure only. Scout comparison integration and recurring
refresh scheduling are not enabled. No report deployment was changed.

## Resources and repeatable command

See [capture-pipeline.md](capture-pipeline.md) for setup, authenticated commands,
retrieval, and resuming interrupted uploads. The dedicated store is
`scout-pm-reports-blob-captures` (`store_JwQkhjM0YGiIsrIe`, private, iad1).
The uploader uses the existing `scout-capture` project's Development OIDC
connection. No static upload token is required. The named `scout-page-captures`
sandbox is under `scout-pm-reports` and was stopped after capture with its
filesystem preserved. Its next command resumes it.

## Full inventory result

- Batch: `scout-captures-20261119210302267-7bb7bd4`.
- Manifest: `captures/scout-captures-20261119210302267-7bb7bd4/manifest.json`.
- Inventory/runner source: `7bb7bd4` (full revisions and hashes are in the manifest).
- Capture window: 2026-11-19 21:03:10.911–21:08:43.305 UTC, 5m 32.394s.
- 135 CSV records; 236 unique usable input URLs.
- 212 URLs produced usable captures; 218 PNG screenshots.
- 24 URLs were unavailable; row 111 also has a missing vanity URL.
- 891 evidence files, 259,367,467 bytes, plus the completed manifest.
- All 891 evidence files were verified after upload. One temporary Blob HTTP 500
  interrupted the first upload; the resumed upload reused identical stored files.

Unavailable URL groups: 17 tracking URLs failed certificate hostname validation
(Brightspeed rows 77, 78, 80, 85–92; Optimum SMB rows 93–98); three Optimum URLs
returned HTTP 404 (rows 122, 123, 125); four Consumer Cellular URLs timed out
(both links on rows 127 and 128). Original URLs and failures remain in the manifest.
No certificate checks or access restrictions were bypassed.

## Verification completed

- Three Chromium/storage regression tests passed, covering queue behavior,
  isolation, primary tab discovery, exclusion of terms, storage immutability,
  retrieval checksums, and missing inputs. A targeted storage test also passed
  after adding bounded transient-error retries.
- Syntax and diff checks passed; dependency audit reported zero vulnerabilities.
- All 135 row mappings and 236 entry mappings reconciled; all 218 PNGs had valid
  headers and the configured 1440-pixel width.
- A stored full-batch entry was downloaded with checksum validation and its
  screenshot opened for visual inspection. This was a spot check, not human
  review of every screenshot or a comparison audit.
- Anonymous access to the full manifest returned HTTP 403.
- The final one-command capture-and-upload path was tested on CSV row 2:
  `scout-captures-20261119210923052-35de64e`, two successful URL captures.

## Scope and next step

Captures include the rendered baseline and discoverable standard product tabs.
Custom selectors/carousels may need reviewed adapters; the batch does not claim
exhaustive coverage of every interactive offer state. No disclosures are opened.
The AT&T spot-check screenshot also retained a cookie banner across part of the
page. Its rendered text is available, but the baseline screenshot alone must not
be treated as proof that every offer is visible. Improve baseline consent-banner
dismissal before relying on screenshot-only comparisons.
Keep all evidence outside Git; private local backups are in the ignored `.scout/`
directory of the capture worktree.

The next separate task is to let Scout select this full batch and read its saved
evidence. Check inventory scope, capture profile and age before comparison; do
not select the later two-URL smoke batch as if it covered the full inventory.
Choose a refresh cadence before enabling an unattended scheduler.
