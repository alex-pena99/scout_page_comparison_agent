# Scout

Scout compares Centerfield vanity and tracking URL pairs for pricing and advertised offer content. The PM asks for an audit and receives a simple list: **Match**, **Mismatch**, or **Needs Review**, with a short reason.

## Start here: master audit guide

**Every audit starts with [coordinate-scout-audit/SKILL.md](coordinate-scout-audit/SKILL.md).**

This is Scout's master step-by-step protocol. It coordinates the five specialist guides; it is not a sixth independent content check. Do not run the specialists as five separate browsing workflows.

The master guide controls:
1. **Start:** Establish scope, load a consistent repository revision, and verify capture capability.
2. **Validate:** Preserve records, check inputs and creative IDs, apply configured template rules, and plan capture reuse.
3. **Capture:** Collect shared page evidence and relevant promotional states.
4. **Compare:** Align offers, apply all five guides, coordinate handoffs, and recheck uncertainty.
5. **Save:** Checkpoint progress and preserve evidence throughout execution.
6. **Report:** Reconcile every requested record and produce the simple PM report.

Specialist guides retain their detailed comparison rules. The master guide defines shared workflow ownership and maps detailed findings into the public results without discarding blockers.

## Specialist guides

| Check | Guide |
| --- | --- |
| Pricing | [pricing-comparison-workflow-guide.md](pricing-comparison-workflow-guide.md) |
| Promo codes | [compare-promo-codes.SKILL.md](compare-promo-codes.SKILL.md) |
| Benefits and inclusions | [compare-benefits-inclusions.SKILL.md](compare-benefits-inclusions.SKILL.md) |
| Dates and durations | [compare-dates-durations.SKILL.md](compare-dates-durations.SKILL.md) |
| Advertised requirements | [compare-advertised-requirements.SKILL.md](compare-advertised-requirements.SKILL.md) |

Pricing includes every literal dollar-sign occurrence within the declared capture coverage. Other checks preserve their offer context. Legal terms review and checkout/redemption testing are outside scope.

## Audit inventory

Default source: [data/scout-url-inventory.csv](data/scout-url-inventory.csv).

Columns: **Account, Vanity URL, Tracking URL, Position, Creative Name, Creative ID**.

- Preserve every source record and its creative context.
- Reuse equivalent captures while validating each record separately.
- Preserve full tracking parameters; never silently repair creative IDs.
- Record the inventory and guide commit used for each audit.
- Treat this CSV as a versioned snapshot, not a live spreadsheet connection.

## PM results

| Result | Meaning |
| --- | --- |
| Match | All required checks completed within scope, comparison is valid, and no differences or unresolved blockers remain. |
| Mismatch | A confirmed difference exists within a valid comparison scope. Mention additional incomplete checks in the reason. |
| Needs Review | Input, identity, offer alignment, capture, ambiguity, or coverage prevents a supported Match and no qualifying confirmed mismatch establishes the result. |

Return a count of results and a simple table:

**Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason**

Keep detailed findings and evidence available for follow-up. Account for every requested record, including failures and duplicate mappings.

## Runtime integration status

This repository currently supplies the audit instructions and input inventory. Adding these files does not deploy a working capture service or install skills into ChatGPT automatically.

The intended runtime is a dedicated agent environment with Playwright and Chromium, such as Vercel Sandbox. Before a production audit, provide and test:
- An agent runner that loads the master guide and all five specialist guides.
- Reusable capture code with readiness checks, equivalent settings, isolated contexts, relevant interactions, and bounded concurrency/retries.
- An explicit tracking-template policy, including treatment of advertising placeholders and `{lpurl}`.
- Durable job, evidence, and report storage outside the temporary sandbox.
- A configured audit profile defining device, location, and required content coverage.

If required capabilities or policies are unavailable, report the affected records as Needs Review. Do not claim that captures or audits ran merely because the instructions exist.

## Suggested agent instruction

> Start every Scout audit with coordinate-scout-audit/SKILL.md. Read the inventory and all five specialist guides from the same recorded repository commit. Follow the master protocol, reuse capture evidence, preserve each record's creative context, and return every requested record as Match, Mismatch, or Needs Review with a short reason.
