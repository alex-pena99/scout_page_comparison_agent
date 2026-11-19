# Headline-view capture fix — verified refresh

Completed: the standalone capture pipeline now collects the missing views on
CSV rows 16 (AT&T Deals) and 20 (AT&T Internet Deals), on both supplied links.

## Implementation

- `capture/headline-tabs.cjs`: discover selected-state tabs without panel IDs,
  Apple/Android pressed-state buttons, and AT&T's observed legacy category
  buttons. Unique visible labels survive page hydration; ambiguous labels use
  scoped selectors. Navigation links, forms and disclosure controls stay excluded.
- `capture/capture.cjs`: explore newly revealed device views before leaving
  their category, verify selection/content changes, scroll the new view and save
  full-page evidence. Reused identical states retain explicit action references.
  Dismiss the known consent banner using its offered “Continue without changes”
  button and verify closure before the baseline capture.
- `capture/batch.test.cjs`: regression fixture covers nested views, missing panel
  IDs, DOM reparenting, full-page screenshots, banner dismissal, and exclusions.
- Capture package coverage text and the pipeline runbook describe the new support.

## Verified saved batch

Use **`scout-captures-20261119213506654-e00cd36`** for rows **16 and 20**.
Its immutable manifest is under `captures/<batch-id>/manifest.json` in the
existing private capture store. Runner/inventory revision: `e00cd36`.

- Four entry URLs captured, zero recorded gaps or unavailable pages.
- Apple iOS and Android verified on both Deals pages. Each site starts on a
  different device family; the default family reuses its Wireless snapshot with
  an explicit `reuseState` reference. Both families have saved text and images.
- Up to 1 GIG and Hyper-gig views captured on both Internet Deals pages.
- 14 screenshots; all 47 evidence files uploaded and checksum-verified.
- Capture window: 2026-11-19 21:35:15.231–21:35:36.318 UTC (21.087 seconds).
- Authenticated retrieval and `comparison/saved_captures.py --rows 16,20` passed
  against the merged latest instructions. Selected-state action records and
  iPhone, Galaxy/Samsung and Hyper-gig price content were verified after download.
- Android and Hyper-gig screenshots were visually inspected. The chat widget is
  still present in some screenshots; the checked headline/device/plan prices
  were readable. This does not certify every possible page overlay or UI state.
- All four capture/storage regression tests and syntax/diff checks passed.

The earlier development batch `scout-captures-20261119213250602-765241a` is
preserved, but had a stale duplicate tab reference; use the batch above instead.
All previous audits and the original full-inventory capture remain intact.

## Next audit

Use the authenticated retrieval and import commands in [run.md](run.md), with
this batch ID and `--rows 16,20` on both commands. These newly captured rows are
ready for a new saved-evidence comparison; no new comparison verdicts or report
publication are claimed by this capture change.

This is a two-row refresh, not a replacement full-inventory batch. Do not silently
combine it with the older full batch. A future full capture uses the improved
runner; scheduling and automatic refresh dispatch remain disabled.
