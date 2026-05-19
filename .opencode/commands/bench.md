---
description: Run or analyze OpenCode workflow benchmark metrics.
agent: workflow-profiler
---

# /bench

Run or analyze benchmark data for `$ARGUMENTS`.

Use the `benchtest-analysis` skill. Prefer existing reports before running new commands. When command execution is needed, start with:

```bash
BENCHTEST_ENABLED=1 npm run benchtest:quick
```

Report:

1. Scenario or report inspected.
2. Token/tool-output deltas.
3. Agent fanout and step count.
4. RTK compression savings.
5. Regressions and concrete workflow changes.

Do not edit production code from this command.
