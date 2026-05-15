# Benchtest — Workflow Audit & Token Overconsumption Detection

A comprehensive benchtest system that measures, tracks, and reports on Pilot's
internal agent workflow performance. Extends the existing benchmark suite
(`bench.sh`/`pilot-bench.mjs`) with **workflow instrumentation**, **token usage
tracking**, and **overconsumption detection**.

---

## Quick Start

```bash
# Full benchtest (all scenarios, generates HTML + JSON reports)
node benchtest-run.mjs --scenario all

# Quick mode — single iteration per scenario
node benchtest-run.mjs --scenario all --quick

# Single scenario
node benchtest-run.mjs --scenario code-review

# Using shell orchestrator
./benchtest.sh --quick

# With custom server
./benchtest.sh --url http://localhost:4096 --quick
```

Reports are written to `benchtest-out-<timestamp>/` or the specified `--out` dir.

---

## Architecture

```
benchtest/
├── package.json                 # ESM package config
├── tsconfig.json                # TypeScript config
├── types.ts                     # Shared metric types (ToolCallMetric, ModelCallMetric, etc.)
├── config.ts                    # Thresholds, model pricing, agent-phase map, scenario registry
│
├── collector/
│   ├── index.ts
│   ├── MetricAggregator.ts      # mean, median, stddev, percentiles, histograms
│   ├── MetricStore.ts           # In-memory metric collection with aggregation
│   └── TokenEstimator.ts        # Char→token estimation (DeepSeek/Qwen calibrated)
│
├── detectors/
│   ├── index.ts                 # DetectionEngine — runs all detectors
│   ├── SpikeDetector.ts         # Token spikes > 2σ from running average
│   ├── TrendDetector.ts         # N consecutive increasing token calls
│   ├── ToolLoopDetector.ts      # N+ tool calls without intervening model call
│   └── ContextWindowDetector.ts # Context growth rate > threshold
│
├── plugins/
│   └── benchtest-plugin.ts      # OpenCode Plugin — hooks into chat.params,
│                                  tool.execute.before/after, session.created,
│                                  experimental.text.complete, compacting
│
├── runners/
│   ├── index.ts
│   ├── WorkflowRunner.ts        # Executes a scenario, collects metrics
│   ├── StressRunner.ts          # N concurrent sessions
│   └── RegressionRunner.ts      # Compares against baseline
│
├── scenarios/
│   ├── index.ts                 # Scenario registry
│   ├── code-review.ts           # Review code files for quality
│   ├── bug-fix.ts               # Diagnose and fix a failing test
│   ├── refactor.ts              # Refactor module with type safety
│   ├── e2e-test.ts             # Write a Playwright E2E test
│   └── docs-update.ts          # Update documentation
│
├── reporters/
│   ├── index.ts
│   ├── TerminalReporter.ts      # Colorized terminal output
│   ├── JsonReporter.ts          # JSON file export
│   └── HtmlReporter.ts          # Self-contained HTML with charts
│
└── __tests__/                   # Unit tests (pure logic)
```

---

## Measurement & Detection

### Token Usage Tracking

| Source | Method | Precision |
|--------|--------|-----------|
| Plugin `chat.params` hook | Records model ID, provider, agent per LLM call | Symbol-level |
| Plugin `chat.message` hook | Estimates input/output tokens from message content | Char-based estimate |
| Plugin `tool.execute.after` hook | Counts tool output chars, estimates tokens | Char-based |
| Plugin `experimental.text.complete` | Counts streaming text tokens | Char-based |
| n9router API (if available) | Actual `prompt_tokens`/`completion_tokens` from API | Exact |

### Tool & Skill Tracking

| Metric | Where | What's Tracked |
|--------|-------|----------------|
| `ToolCallMetric` | Every `tool.execute.before/after` | Tool name, agent, duration, input/output size, RTK savings |
| `SkillMetric` | Skill load events | Skill name, load time, execute count, estimated tokens |
| `HookExecutionMetric` | Every plugin hook execution | Hook name, plugin, duration |

### Overconsumption Detectors

| Detector | Threshold | What It Catches |
|----------|-----------|-----------------|
| **SpikeDetector** | > 2σ from running avg | Sudden token bursts per (agent, model) pair |
| **TrendDetector** | 5 consecutive increases | Runaway context growth |
| **ToolLoopDetector** | > 10 tool calls without model call | Stuck-in-tool-loop patterns |
| **ContextWindowDetector** | > 30% growth per cycle | Context window pressure |

### Report Sections

The HTML report includes:
- **Summary cards**: Pass/fail, total tokens, estimated cost, tool/model call counts
- **Token usage by phase**: Prompt/completion breakdown per workflow phase
- **Token usage by agent**: Per-agent token consumption
- **Token usage by model**: Per-model breakdown
- **Phase timeline**: Visual bar chart of phase durations
- **Phase table**: Detailed timing, tool calls, model calls per phase
- **Alerts**: All overconsumption alerts with severity and location
- **Tool call distribution**: Count, total time, avg time per tool
- **Recent model calls**: Last 20 model calls with token/duration details

---

## Detectors Configuration

Thresholds in `benchtest/config.ts`:

```typescript
export const DETECTOR_THRESHOLDS = {
  spikeSigmaMultiplier: 2,    // Standard deviations for spike detection
  trendWindow: 5,              // Consecutive calls for trend detection
  toolLoopMax: 10,             // Max tool calls without model intervention
  contextGrowthRate: 0.3,      // 30% context growth per cycle alert
};

export const TOKEN_THRESHOLDS = {
  'n9router': { perCall: 16_000, perSession: 200_000 },
  'anthropic': { perCall: 8_000, perSession: 100_000 },
};
```

---

## Commands

| Command | What it runs |
|---------|-------------|
| `npm run benchtest` | Full benchtest (all scenarios, all iterations) |
| `npm run benchtest:quick` | Quick mode (single iteration per scenario) |
| `node benchtest-run.mjs --scenario <name>` | Single scenario |
| `./benchtest.sh --quick` | Shell orchestrator with timestamps |
| `node benchtest-run.mjs --stress 5` | 5 concurrent stress sessions |

## CLI Options

```
--scenario <name>   Scenario: code-review|bug-fix|refactor|e2e-test|docs-update|all
--url <url>         OpenCode server URL
--api-key <key>     API key
--out <dir>         Output directory
--quick             Single iteration, reduced work
--stress <n>        N concurrent stress sessions
--baseline <file>   Baseline JSON for regression comparison
--verbose           Verbose logging
```

## Output Files

| File | Description |
|------|-------------|
| `benchtest-<scenario>.json` | Full report in JSON format |
| `benchtest-<scenario>.html` | Self-contained HTML report |
| `benchtest-stress.json` | Stress test results (if --stress used) |
| `metrics-<scenario>.jsonl` | Raw plugin metrics (JSON Lines) |

---

## Integration with Existing Bench Suite

The benchtest system is **complementary** to the existing `bench.sh` suite:

| Suite | What it measures | Output |
|-------|-----------------|--------|
| `bench.sh` (existing) | HTTP-level server perf, load, SSE, memory | `pilot-audit-*.html` |
| `benchtest` (new) | Internal workflow perf, token usage, overconsumption | `benchtest-*.html` |

Run both for full coverage:
```bash
./bench.sh --fast && ./benchtest.sh --quick
```

---

## Development

### Adding a New Scenario

1. Create `benchtest/scenarios/my-scenario.ts`
2. Export a `Scenario` object with task prompt, expected phases, token budget
3. Register in `benchtest/scenarios/index.ts`
4. Add to `SCENARIOS` array in `benchtest/config.ts`

### Adding a New Detector

1. Create `benchtest/detectors/MyDetector.ts`
2. Implement `evaluate(modelCall)` returning `DetectorAlert | null`
3. Register in `benchtest/detectors/index.ts` `DetectionEngine` class

### Running Unit Tests

```bash
npm run test -w benchtest
npm run typecheck -w benchtest
```
