# Scout PM report viewer

The viewer serves saved audits at `/reports/<audit-id>`. It renders a single report and reads supporting files from private Vercel Blob. Vercel Authentication must protect **All Deployments** in the dedicated project, including production domains and direct function URLs. Keep that protection enabled when deploying changes.

## Deploy

Link this directory to the dedicated viewer project. Connect a private Blob store and deploy from this directory. The Blob SDK accepts the managed project connection, which supplies either project-scoped OIDC and `BLOB_STORE_ID` or a server-only `BLOB_READ_WRITE_TOKEN`. Verify that signed-out requests to the production report, evidence and direct function URLs are denied before uploading any audit data.

Run `npm ci` and `npm run check` before deploying source changes. The viewer uses Node.js 24 and a single read-only Vercel Function. The existing Scout capture deployment has its own project.

## Add a saved report

Place the completed audit's presentation JSON at `reports/<audit-id>/report.json` in the private store. The JSON contains `id`, `name`, `date` (ISO date), `displayDate`, `scope`, `limitations`, `documents`, `captures` and `rows`.

- Each row has a numeric `number`, `name`, `creativeId`, saved `status`, `reason`, `contentFinding`, `identity` (`issue`, `requested`, `note`), and `vanityCapture` and `trackingCapture` keys into `captures`.
- Each capture has `finding`, `quotes`, `sourceUrl`, optional `finalUrl`, optional `captureFile`, and optional `screenshot` (`file`, `alt`, `caption`).
- Each document has a `file` and a `label`. Put referenced PNG, JSON and ZIP files in `reports/<audit-id>/evidence/` under the same filenames. Use lowercase alphanumeric and hyphen filenames with one extension. Upload the evidence before publishing the report JSON. Use stable pathnames and preserve the original verdicts and source URLs.

Keep saved audits, raw captures and credentials in their approved storage. This repository holds the viewer source only.
