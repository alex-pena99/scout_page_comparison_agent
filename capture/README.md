# Scout capture runner

This is the maintained Playwright runner used for Scout's capture execution benchmark. It extends the fourth audit's capture runner. The [coordinator](../coordinate-scout-audit/SKILL.md) and [execution contract](../references/capture-execution.md) define when evidence is sufficient and how it affects verdicts.

Use Node.js 24 and `npm ci` in this directory. Run `npm test` in the Linux Chromium sandbox. Set `SCOUT_CHROMIUM_PATH` to the path to a compatible installed Chromium binary when needed. The default resolves the pinned sandbox Chromium package.

```sh
node capture.cjs INPUT.json OFFER_PLAN.json EVIDENCE_DIRECTORY
node capture.cjs INPUT.json FOLLOWUP_PLAN.json EVIDENCE_DIRECTORY --reopen
```

The input contains the recorded audit ID, instruction and inventory revisions, config version, capture configuration and unique entry targets. Each target has a stable key, original and navigation URLs, and the source rows and roles it serves. Use the pinned inventory and selection guards to prepare the input. Provide the runner file's SHA-256 as `runner_revision` or let the CLI calculate it.

The offer plan maps entry keys to ordered actions. Each action has a stable `id`, an offer `reason`, and a locator by exact label, accessible label or CSS selector. An ordinal is allowed when accompanied by the expected candidate count. Use `expected` for the offer text, visible or hidden selector, selected device or view, and whether visible text should change. `dependsOn` identifies an action that must have succeeded in the current visit. `required: false` records a probe whose coverage must be assessed separately. A named provider card uses `provider`. For any later decision, include only unresolved work and its required prerequisites in the follow-up plan.

Each worker owns one context at a time. Entries perform their planned actions in their baseline context and become eligible as worker capacity frees. Follow-ups reopen the original URL in a clean context. A pre-scroll destination and content signature verifies baseline reuse. A changed signature preserves the old visit, marks it invalidated, and captures a replacement baseline. The comparison must review the transition before combining evidence.

Each entry writes baseline and visit checkpoints, JSON and PNG evidence, action outcomes, operation durations, and coverage observations. Queue telemetry records actual start and finish events and peak worker activity. Durations use a monotonic clock. UTC and clock origins allow correlation across processes. Record planning, evidence transfer, comparison, publication and final verification in the calling audit's delivery checkpoint. Keep the input, plan, and evidence out of Git.
