# Scout Chromium capture

The maintained Playwright runner originated in `aeb9e2f`. The current code uses the config v5 headline-only capture profile.

- `prepare.py` pins instructions and runner, saves the exact CSV selection and deduplicates navigation entries.
- `capture.cjs` records baseline and verified headline states with isolated Chromium contexts and a shared continuous queue.
- `plan.cjs` lists captured control candidates and validates reviewed headline action plans.
- `capture.test.cjs` uses local fixtures to exercise scheduling, scoped interactions, evidence reuse and isolation.

See the [run instructions](../docs/run.md) for setup, sandbox transfer, planning and resume.
