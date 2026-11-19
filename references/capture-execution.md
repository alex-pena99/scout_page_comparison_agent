# Scout Capture Execution

Implementation contract for the capture runner. Read with the [master guide](../coordinate-scout-audit/SKILL.md) and [audit config](../config/audit-config.json). This reference optimizes execution; pricing/offer scope and result rules stay unchanged.

## Integration status

The existing sandbox run used capture.cjs, but that source is not currently checked into this repository. The settings below describe required behavior, not proof of a deployed implementation. Obtain the actual runner and its dependencies, put them in a maintained code location, and modify that implementation rather than recreating it from audit prose. Record its repository/revision, or a content hash for an uncommitted runner.

Keep the current browser settings, timeouts, four-worker limit, cumulative entry budget, and shared retry/recheck limits while measuring these optimizations. This is not permission to force-click disabled controls or bypass certificates/access controls.

## 1. Continuously filled queue
**Goal:** Keep available capacity productive without increasing concurrency.

- Replace fixed batches with at most four active capture workers. As a worker finishes an entry, let it take the next ready entry immediately.
- Count follow-ups and rechecks against the same concurrency cap. One worker owns a page while its sequential actions run; do not manipulate that page concurrently.
- Enqueue targeted work when its evidence dependencies are ready. Do not wait for an entire unrelated pass to finish before starting ready follow-ups.
- Preserve record-to-entry mappings, exact URL deduplication, and session isolation. Different tracking templates remain different entry points even when they redirect alike.
- Instrument actual worker activity, queue waits, and task lifetimes. Four configured slots do not prove four jobs were active.

## 2. Baseline and page lifecycle
**Goal:** Avoid repeating navigation, scrolling, and baseline artifacts.

1. Open one isolated context for a unique entry and capture its baseline once.
2. Determine required offer views from that evidence. Select explicit device families rather than accepting whichever Wireless subtab happens to open first.
3. Reuse the page/context through those interactions when practical. Retain context only within the original entry's workflow; never share campaign cookies between different entry URLs.
4. Keep at most four live capture pages/contexts, including retained idle pages. Do not leave all 42 entries open. Release idle pages if holding them blocks ready work or the cumulative entry deadline expires.
5. If a later agent decision arrives after release, reopen the original entry in a clean context. Restore only prerequisites needed to reach the missing state and capture that state.
6. Do not automatically repeat a complete scroll, full-page screenshot, or unchanged baseline on reopening. Revalidate destination and relevant content first. If routing/content changed materially, record the change and replace invalid evidence rather than mixing incompatible states.
7. Record each visit and whether the baseline was reused, invalidated, or recaptured. All revisits remain within existing cumulative entry budgets.

Agent planning may run while other entries capture. Keep enough baseline text/control metadata to plan without reopening. Record planning waits separately; keeping a page alive is an optimization, not a requirement to hold it indefinitely.

## 3. Interaction protocol
**Goal:** Spend waits on achievable offer-state changes.

Before each action, identify the missing offer fact or potentially distinct offer. If sufficient equivalent evidence already exists, skip the action as redundant.

1. **Define success.** Examples: Android is selected and Android offers appear; a requested panel's offer content is visible; the blocking dialog disappears and the underlying control is accessible.
2. **Inspect current state.** Ensure the target is uniquely identified, visible, enabled, and not obscured. Resolve locators from fresh page state after navigation or meaningful DOM changes.
3. **Handle disabled controls.** Skip a control that is disabled in the current state. Do not perform three ten-second attempts against the same disabled Next button. If an expected load legitimately enables it, observe that transition within the existing readiness/action budget before acting.
4. **Order actions.** Select necessary product, plan, Apple/Android, or other offer views before opening a disclosure that would obstruct them. Open supporting details only for an in-scope offer reason.
5. **Act and verify.** Perform the action, then wait for its defined success condition within the existing interaction timeout. Replace fixed 450 ms post-click sleeps with state verification. Account preflight/action/verification against the shared entry deadline; do not add unlimited waits by chaining checks.
6. **Recover once when justified.** For an obstruction, identify it and use an appropriate close/dismiss control. Verify closure before the next dependent action. A recovery/retry must fit the existing shared retry/recheck budgets; this protocol grants no additional independent budget.
7. **Stop unchanged failure.** Record failure and do not repeat it unless the relevant state or obstruction actually changed. Never force-click through overlays or invoke hidden controls to manufacture a captured state.
8. **Assess coverage.** Skipping an action is not skipping the coverage assessment. If needed facts are visible elsewhere, continue. Otherwise record the precise necessary gap and affected comparisons.

For carousels, track visible offer identifiers/content. Stop when required offers are captured, the control is disabled, the state repeats, or no new offers appear. Do not treat duplicate UI copies as new evidence.

Playwright already performs actionability checks and can wait until timeout for disabled or obscured targets. Use that behavior for real transitions, not as repeated polling of a known unchanged obstruction. See [Playwright actionability](https://playwright.dev/docs/actionability) and [locators](https://playwright.dev/docs/locators).

## 4. Evidence and scrolling
**Goal:** Preserve offer coverage while reducing redundant artifact work.

- Save the baseline evidence once, then capture changed offer states and screenshots/crops needed for images or review. A full-page screenshot after every click is not required.
- Record scroll completion, final scroll position/height, and any interrupted or growing page. Bound scrolling by the existing entry deadline.
- Separately record which in-scope offer sections/states were inspected and whether relevant lazy content remains unresolved. A full-page screenshot does not prove lazy content loaded; failure to confirm bottom does not alone prove a missing offer.
- Classify failed or skipped interactions using the master's relevance rules: sufficient equivalent evidence or excluded content is a nonblocking note; necessary missing pricing/offer evidence remains a blocker.
- Do not remove saved earlier evidence or rewrite historical verdicts when preparing a faster rerun.

## 5. Timing and provenance
**Goal:** Make the next optimization measurable.

Record audit ID, instruction commit, runner revision/content hash, config version, inventory revision, selected records, entry URL, visit ID, and action/offer-state IDs.

Use monotonic clocks for elapsed durations and UTC timestamps for event correlation. Record operations separately:

| Capture | Agent and delivery |
| --- | --- |
| Queue wait and context setup | Planning/review and between-task gaps |
| Navigation and readiness | Evidence transfer |
| Scrolling and extraction | Report assembly |
| Preflight, click, expected-state verification | Packaging/publication |
| Modal recovery, screenshots, artifact writes | Final verification |
| Context teardown | End-to-end audit elapsed time |

Record outcome/reason and whether operations overlap. Keep worker start/finish intervals and counts of visits, baseline captures, reopens, skipped disabled controls, obstructed/timed-out actions, unchanged repeated attempts, completed required offer states, and necessary gaps.

Define capture wall time as first capture-task start before context setup through final capture-task finish after teardown, including capture-stage planning/scheduling gaps. Also report active capture interval coverage and agent-review time separately. Define end-to-end time from accepted audit start through final report verification. State exclusions and missing timers explicitly.

Do not sum parallel task/action durations and call the sum wall time. Do not subtract overlapping timeout totals from runtime to promise savings. Repeated unchanged attempts should be zero; lack of a timer is unknown, not zero.

## 6. Same-selection benchmark
**Goal:** Establish speed gains without hiding lost offer coverage.

Obtain the exact 25-record input/selection manifest and inventory version from the prior sandbox run. Validate its row/record guards before capture. Do not infer the selection from the count, report title, or a few listed findings. Do not replace the existing five-record pilot or fall back to the full inventory.

Compare capture wall time, end-to-end time, repeated visits/baselines, failed/skipped interactions, and required offer-state coverage. Explain every verdict change using evidence: content changed, an earlier gap was resolved, or prior coverage was overstated. Preserve earlier reports/evidence. A faster run with lower necessary coverage is not a proven equivalent-work speedup.

## 7. Runner acceptance checks
**Goal:** Verify implementation before the live benchmark.

Use controlled fixtures to show:
- A fifth ready entry starts when one of four workers finishes, without waiting for the slowest batch member; active pages/contexts never exceed four.
- A disabled carousel control is skipped without a click attempt; visible offers remain comparable, while missing necessary offers retain a gap.
- An overlay is dismissed and confirmed closed before a dependent click. An undismissable overlay does not trigger repeated unchanged clicks or force-clicks.
- Selecting Android verifies both selected state and associated offer content, without relying on a fixed sleep.
- Same-entry interactions reuse a baseline/context when practical, and different entry URLs remain isolated. Reopening captures missing state unless prior evidence is invalidated.
- Interrupted scrolling is evaluated by offer coverage, not automatically passed or failed.
- Operation timings and instruction/runner revisions appear in saved evidence, with existing deadlines enforced.

These are implementation checks, not claims that this repository already contains or has tested the runner. Complete them in the maintained runner location, then rerun the exact prior selection.
