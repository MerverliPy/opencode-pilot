---
name: benchtest-analysis
description: "Use for reading Pilot benchtest configuration, benchmark outputs, workflow metrics, RTK savings, and agent fanout regressions."
compatibility: opencode
---

# Benchtest analysis

## Sources

Prefer existing files before running new benchmarks:

- `benchtest/config.ts`
- `benchtest/plugins/benchtest-plugin.ts`
- `benchtest-out-*/`
- benchmark JSON summaries and HTML reports
- RTK annotations in tool output

## Metrics to inspect

- agent phase count and total turns
- reviewer fanout per task
- tool call count and tool output bytes
- RTK before/after byte savings
- context pack size
- verification command duration
- first blocking failure quality

## Thresholds

Use configured thresholds from `benchtest/config.ts` when present:

- workflow routing latency
- context pack line budget
- plugin hook overhead
- RTK minimum savings ratio
- reviewer fanout maximum

## Report shape

```text
BENCHTEST ANALYSIS
- scenario/report:
- metrics:
- regressions:
- improvements:
- recommended workflow change:
- verification:
```

Avoid speculative recommendations. Tie every recommendation to a metric, threshold, or observed failure.
