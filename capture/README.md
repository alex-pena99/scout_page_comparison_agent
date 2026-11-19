# Scout Chromium capture

The maintained Playwright runner originated in `aeb9e2f`. The current code uses the config v5 headline-only capture profile.

- `prepare.py` pins instructions and runner, saves the exact CSV selection and deduplicates navigation entries.
- `capture.cjs` records baseline and verified headline states with isolated Chromium contexts and a shared continuous queue.
- `plan.cjs` lists captured control candidates and validates reviewed headline action plans.
- `capture.test.cjs` uses local fixtures to exercise scheduling, scoped interactions, evidence reuse and isolation.

One consistent Chromium viewport is used for capture; no browser-device matrix or layout comparison is required. For `default-view-headlines-v1`, the runner scrolls the default view and disables alternate offer navigation, including Apple/Android tabs and speed/line selectors. Nonempty action plans and followup mode are rejected. Older interaction capabilities remain for explicit historical-scope runs only. Comparison is text-first; screenshots support necessary visual reading. See the [runtime follow-up](../docs/run.md#runtime-follow-up) for the existing packaging screenshot gate.

See the [run instructions](../docs/run.md) for setup, sandbox transfer, planning and resume.
