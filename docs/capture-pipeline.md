# Standalone page capture

Captures only: no comparison, verdicts, report publication, or viewer deployment.
The inventory is the committed CSV, defaulting to all records. Exact duplicate
entry URLs share evidence while every CSV row keeps its original mapping.

## Comparison boundary

Normal Scout audits select a saved batch and read its evidence; they do not launch this pipeline or browse live pages. See [run.md](run.md) and [the coordinator](../coordinate-scout-audit/SKILL.md) for row mappings, age/coverage validation, refresh requests, and the implemented saved-batch importer/report commands. Playwright is used by standalone CLI code, not exposed here as an MCP tool or callable agent. A refresh is a separate authorized operation.

## Resources

`config/capture-store.json` names the dedicated private captures store, project,
region, and sandbox. Report storage and its credentials remain separate.
No schedule is enabled. A future scheduler would need an approved cadence and authorized runtime identity; none is created by these instructions.

Install Node 24, Python 3, Git, and the official `sandbox` CLI (tested 4.12.0).
Run `npm ci --prefix capture`. Authenticate the CLI to Centerfield. The named
`scout-page-captures` sandbox must exist under the configured Scout project;
use four vCPUs, iad1, and sufficient lifetime for a full capture (45 minutes for
the initial setup). The runner uses four isolated page contexts concurrently.

On a fresh Ubuntu sandbox, install Chromium's system libraries once (the named
sandbox preserves installed packages across stops):

```sh
sandbox exec --sudo --project prj_9p9wuLVeLNdnzZuF0WFJBmtU79Ou --scope centerfield scout-page-captures apt-get update
sandbox exec --sudo --project prj_9p9wuLVeLNdnzZuF0WFJBmtU79Ou --scope centerfield scout-page-captures apt-get install -y libnss3 libnspr4 fonts-liberation
```

These packages were verified against the current Ubuntu sandbox image. A runner
startup failure exits unsuccessfully and retains any recovered artifacts; it
does not publish an empty capture batch as a successful run.

## Capture and store

The uploader is connected to the existing `scout-capture` project in Development
using short-lived OIDC authentication. The browser sandbox is scoped separately
to `scout-pm-reports`; its commands receive no storage credentials. The existing
report-store token is not used. With both CLIs installed and signed in, the full
capture-and-upload command is:

```sh
vercel env run --environment development --project prj_XifLZUl5IZ7GE3UZ0krk4tXODxiy --scope centerfield -- node capture/run-remote.mjs
```

For capture without uploading:

```sh
node capture/run-remote.mjs --capture-only
# Optional explicit small selection:
node capture/run-remote.mjs --rows 2,3 --capture-only
```

The command pins the committed runner/inventory, transfers source and inputs to
the dedicated sandbox, runs Chromium without publisher credentials, copies the
evidence back into the ignored `.scout/` directory, and builds a capture package.
It prints the exact run directory. Keep that directory private and durable.
After interruption, use `--resume RUN_DIRECTORY --capture-only` on the same Git
revision. A lock prevents concurrent launches from this checkout; if the host is
killed, verify its job has stopped before manually removing the stale lock.

Supply `SCOUT_CAPTURE_STORE_ID` and either the dedicated
`SCOUT_CAPTURE_READ_WRITE_TOKEN` or authorized capture OIDC credentials to the
host-side uploader, never the capture VM. Do not use the report store's token.
The configured store ID is `store_JwQkhjM0YGiIsrIe`. Keep tokens out of shell
arguments, Git, logs, and chats. Project production secrets may be unavailable
to a local process; use an authorized host credential or a Development-enabled
OIDC connection rather than attempting to bypass that protection.

```sh
node capture/storage.mjs smoke unique-connection-check-id
node capture/storage.mjs publish RUN_DIRECTORY/capture-package
node capture/storage.mjs list
node capture/storage.mjs get BATCH_ID NEW_PRIVATE_DIRECTORY
# Optional selected rows (includes the pinned inventory):
node capture/storage.mjs get BATCH_ID ANOTHER_NEW_PRIVATE_DIRECTORY --rows 2,3
```

For example, publish an already captured package without creating an env file:

```sh
vercel env run --environment development --project prj_XifLZUl5IZ7GE3UZ0krk4tXODxiy --scope centerfield -- node capture/storage.mjs publish RUN_DIRECTORY/capture-package
```

Use the same `vercel env run ... --` prefix for `list` and `get`. This keeps the
short-lived credential in the host process environment rather than in Git or
the browser VM. An unattended scheduler will need its own authorized runtime
identity; the current CLI login is not a hosted schedule.

Without `--capture-only`, the remote command also runs the uploader using its
host environment. If upload fails, rerun only `storage.mjs publish` against the
same package. It resumes identical files and rejects conflicting overwrites.
Temporary storage/network failures retry at most twice; each attempt checks for
an already stored identical file before writing again.
Do not rebuild an already published package under the same batch ID.

## Stored evidence

`captures/BATCH_ID/manifest.json` maps every requested row and unique URL to its
screenshots, rendered text, state JSON, timestamps, final URL, and failures.
Objects are immutable. Every file is checksum-verified after upload and retrieval;
the manifest is uploaded last. A finished batch can contain failed captures and
is labeled `finished_with_gaps`; it is not an assertion of complete coverage.
Consumers must select a batch whose inventory, requested rows, profile, and age
fit the audit. A later small test batch does not supersede a full inventory batch.

The baseline screenshot is full-page. Standard product tabs with an explicit
associated panel are discovered automatically, including newly revealed tabs.
Actions are verified and bounded; terms, forms, disclosures, and external CTAs
are excluded. Custom controls without tab semantics require a reviewed action
plan or adapter. Saved control metadata makes this visible; never describe the
batch as exhaustive across every possible interactive state. Rendered text is
raw evidence, not AI-extracted or verified headline facts.

Snapshots remain separate by batch. Never silently fill a failed fresh capture
with an old file. No automatic deletion/retention policy is enabled.

## Verify

```sh
SCOUT_CHROMIUM_PATH=/path/to/chromium npm test --prefix capture
npm run check --prefix capture
```

Tests cover product-tab discovery, prohibited detail clicks, four-worker
scheduling, context isolation, capture gaps, path validation, missing inputs,
immutable uploads, corrupt downloads, and rejection of report credentials.
