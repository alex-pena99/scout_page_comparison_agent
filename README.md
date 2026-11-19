# Scout

Scout compares Centerfield vanity and tracking URL pairs for pricing and advertised offer content. The PM asks for an audit and receives a simple list: **Match**, **Mismatch**, or **Needs Review**, with a short reason.

## Start here: master audit guide

**Every audit starts with [coordinate-scout-audit/SKILL.md](coordinate-scout-audit/SKILL.md).**

This is Scout's master step-by-step protocol. It coordinates the five specialist guides; it is not a sixth independent content check. Do not run the specialists as five separate browsing workflows.

The master guide controls:
1. **Start:** Establish scope, load a consistent repository revision, and verify capture capability.
2. **Validate:** Preserve records, check URL inputs, apply configured template rules, and plan capture reuse.
3. **Capture:** Collect shared page evidence and relevant promotional states.
4. **Compare:** Align offers, apply all five guides, coordinate handoffs, and recheck uncertainty.
5. **Save:** Checkpoint progress and preserve evidence throughout execution.
6. **Report:** Reconcile every requested record and produce the simple PM report.

The coordinator and specialists share captures and evidence requests. References between guides do not start recursive full audits or grant separate retry budgets.

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

Columns: **Account, Vanity URL, Tracking URL, Position, Creative Name**.

- Preserve every source record and its creative context.
- Reuse equivalent captures while validating each record separately.
- Preserve every tracking parameter, including c=; never change the delivered routing to make pages agree.
- Record the inventory and guide commit used for each audit.
- Treat this CSV as a versioned snapshot, not a live spreadsheet connection.

## Content-only comparison

Scout does not require or validate Creative ID. Ignore it in legacy inputs; do not generate campaign-ID mismatch or missing-ID findings. The inventory has five columns and keeps every original record. Creative Name provides context only: labels alone cannot trigger Needs Review or override matching delivered content.

Compare actual offers on the supplied pages. Preserve complete tracking URLs, including c=, because parameters may determine what loads. Input failures, unrelated page experiences, ambiguity, and capture/coverage problems still require review. Read historical results as old audit records; rerun with the new instructions to obtain content-only results.

This repository contains no capture runner or result-aggregation implementation. Any external deployed runner must also remove ID-based gates and load this updated inventory/configuration; changing these files does not retroactively change saved reports.

## V1 capture defaults

Source: [config/audit-config.json](config/audit-config.json).

- Dedicated desktop Chromium, 1440 x 900, en-US, America/New_York.
- Equivalent execution region and settings; no ZIP/address submission or nationwide coverage claim.
- Fresh isolated context per unique entry point; reuse the browser process and equivalent captures.
- At most four simultaneous page captures, one transient retry, and one targeted recheck per distinct uncertain evidence need.
- Provisional limits: 30s navigation, 15s readiness, 10s interactions, 180s total per entry including retries and additional states. A timeout leaves coverage incomplete; tune limits from measured pilot results.
- Inspect the entire rendered page (scrolling as needed), relevant product tabs, offer details, promotional pop-ups/accordions, directly relevant FAQs, and promotional image text. Record unsupported relevant iframe/shadow-root coverage.
- Mobile/tablet, checkout, forms, unrelated navigation, and legal-policy review are outside V1.

### Supplied tracking templates

Open tracking links as supplied, retaining advertising placeholders and all parameters. Add a missing scheme for navigation and permit normal browser encoding; preserve original, navigation, and final URLs. Do not substitute {lpurl} or fabricate ad-click values. Follow redirects; placeholder presence alone is not an error. Report unusable destinations as Needs Review. These are supplied-template observations, not simulated resolved advertising clicks.

### Pilot versus full audit

- **Full audit:** With no filter, select every record from the inventory at the run's recorded commit.
- **Development pilot:** Explicitly request the pilot in [config/pilot-config.json](config/pilot-config.json). It selects CSV rows **2, 16, 17, 100, and 111** (header is row 1) from the pinned approved inventory revision. They cover baseline, product views, shared URLs with different descriptive labels, differing page experiences, and missing input.
- Before pilot capture, validate its inventory revision/hash, five-record count, and exact five-column record guards. A selection error aborts the pilot; **never fall back to all 135 records**. The selected rows' existing input issues remain audit findings.
- Record both the instruction commit and pinned pilot-inventory revision. Never apply pilot row numbers to another inventory. A future inventory update requires explicit pilot revalidation.
- Known pilot cases are test coverage, not precomputed current website results. No campaign captures have been executed by adding these configs.

## PM results

| Result | Meaning |
| --- | --- |
| Match | All required checks completed within scope, comparison is valid, and no differences or unresolved blockers remain. |
| Mismatch | A confirmed difference exists within a valid comparison scope. Mention additional incomplete checks in the reason. |
| Needs Review | Input, offer alignment, capture, ambiguity, or coverage prevents a supported Match and no qualifying confirmed mismatch establishes the result. |

Return a count of results and a simple table:

**Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason**

Keep detailed findings and evidence available for follow-up. Account for every requested record, including failures and duplicate mappings.

## Runtime integration status

This repository currently supplies the audit instructions and input inventory. Adding these files does not deploy a working capture service or install skills into ChatGPT automatically.

The intended runtime is a dedicated agent environment with Playwright and Chromium, such as Vercel Sandbox. Before a production audit, provide and test:
- An agent runner that loads the master guide and all five specialist guides.
- Reusable capture code with readiness checks, equivalent settings, isolated contexts, relevant interactions, and bounded concurrency/retries.
- The implemented supplied-template handling and capture defaults specified in config/audit-config.json.
- Durable job, evidence, and report storage outside the temporary sandbox.
- A configured audit profile defining device, location, and required content coverage.

Configuration files define the execution contract; they do not enforce it until implemented by the runner. If required capabilities are unavailable, report the affected records as Needs Review. Do not claim that captures or audits ran merely because the instructions exist.

## Suggested agent instruction

> Start every Scout audit with coordinate-scout-audit/SKILL.md. Read the inventory and all five specialist guides from the same recorded repository commit. Follow the master protocol, reuse capture evidence, preserve each record's creative context, and return every requested record as Match, Mismatch, or Needs Review with a short reason.
