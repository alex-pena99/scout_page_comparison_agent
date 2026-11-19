# Scout

Standalone capture and private storage: [capture pipeline](docs/capture-pipeline.md).
It saves timestamped page evidence independently of comparisons and reports.

**Headline pricing and offer comparison** between supplied vanity and tracking pages.

The PM requests an audit and receives Match, Mismatch, or Needs Review with a short reason. Scout compares headline information only; it does not investigate complete offer terms.

## Start here

Use [coordinate-scout-audit/SKILL.md](coordinate-scout-audit/SKILL.md) as the master protocol, [config/audit-config.json](config/audit-config.json) for scope/capture settings, and [references/capture-execution.md](references/capture-execution.md) for execution and sandbox implementation requirements.

## Compare only

- Displayed headline/offer-card prices and billing units.
- Basic product or plan names.
- Headline savings, rewards, discounts, benefits, and promo codes.
- Promotional durations stated directly in the headline or offer card.

Read primary offers across the rendered page and relevant product tabs, not just the first viewport. Relevant headline-offer selectors/carousels may be used. Read image-based headline text when necessary. Preserve "from," "up to," reward types, and monthly/per-line units.

## Do not check

Eligibility rules, AutoPay/bundle/trade-in/customer qualifications, detailed requirements, full disclosures, legal wording, redemption procedures, or administrative terms are outside scope, even if qualification clauses appear next to the headline price. Do not compare full raw card strings containing those clauses.

**Do not open terms, FAQs, supporting-detail panels, or disclosure modals to complete an offer.** Missing supporting details or failed disclosure interactions must not block Match. "60-day money-back guarantee" can agree without inspecting how the guarantee works. Never assume unreadable headline content matches.

## Four active comparison guides

| Check | Guide |
| --- | --- |
| Headline pricing and product/plan | [pricing-comparison-workflow-guide.md](pricing-comparison-workflow-guide.md) |
| Displayed headline codes | [compare-promo-codes.SKILL.md](compare-promo-codes.SKILL.md) |
| Headline rewards and benefits | [compare-benefits-inclusions.SKILL.md](compare-benefits-inclusions.SKILL.md) |
| Directly stated promotional durations | [compare-dates-durations.SKILL.md](compare-dates-durations.SKILL.md) |

[compare-advertised-requirements.SKILL.md](compare-advertised-requirements.SKILL.md) is a disabled compatibility stub. Do not run it, demand its completion, or allow it to affect the public result. Creative ID remains unused; Creative Name is context only.

## Results and report

| Result | Meaning |
| --- | --- |
| Match | Headline prices and offers agree. |
| Mismatch | A headline price or offer differs, or an advertised offer is absent from the corresponding readable page. |
| Needs Review | A page is unavailable, necessary headline content cannot be read, or there is no identifiable comparable offer. |

An unreadable headline is not proof of absence. A changed product in an identifiable corresponding primary offer can be a mismatch; sales versus unrelated support with no comparable offer requires review. A market/location label alone does not block readable headline agreement or require ZIP entry.

Label every new report **Headline pricing and offer comparison**. Return result counts and **Row | Account | Creative | Vanity URL | Tracking URL | Result | Reason**. Use reasons such as "$35/mo versus $45/mo" or "Tracking headline price unreadable," not "eligibility unverified." Match does not certify eligibility, terms, commercial correctness, or all markets/devices.

## Preserve inputs and capture optimizations

The [CSV](data/scout-url-inventory.csv) keeps **Account, Vanity URL, Tracking URL, Position, Creative Name**. Preserve all original records and exact URL values. Navigate supplied tracking templates with all parameters/placeholders intact, adding a missing scheme for navigation only and following normal redirects. Do not replace {lpurl}, fix routing, or compare campaign identifiers.

No filter means the full inventory. The existing [five-record pilot](config/pilot-config.json) remains unchanged and uses its pinned inventory/hash and exact row guards; invalid pilot selection must not fall back to all records. The old pilot instruction to read all guides does not activate the disabled requirements stub.

Keep dedicated desktop Chromium (1440 x 900), equivalent locale/region, clean isolated contexts, the continuously filled four-worker queue, bounded same-entry reuse, targeted reopening, state verification, one transient retry/shared targeted recheck, existing timeouts, and operation timings. Do not repeat disabled/unchanged failures. TLS validation, access protections, and source read-only behavior remain intact. See the execution reference for exact limits and acceptance checks.

## Maintained implementation

Follow the [end-to-end run instructions](docs/run.md) to pin a selection, capture evidence, review headline facts, package a report and publish it to the existing private viewer.

| Path | Role |
| --- | --- |
| [capture/](capture/) | Selection, Playwright runner, headline action planning and controlled browser fixture. |
| [comparison/](comparison/) | Validate reviewed facts against captured evidence and produce one result per selected row. |
| [reporting/](reporting/) | Assemble and verify the saved report and its evidence, then publish to private Blob when authorized. |
| [web/](web/) | Source for the existing private report viewer. |
| [docs/](docs/) | Setup, run, resume and verification instructions. |

The runner originated in `aeb9e2f` and the maintained implementation applies config version 5. Keep the private run directory, audit evidence and credentials outside Git. Preserve historical reports and evidence. A requested reassessment produces a separate report with its evidence date and scope. Repository changes do not start captures or deploy the viewer.
