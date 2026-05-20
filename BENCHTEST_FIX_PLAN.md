# Benchtest Fix Plan: Three Root Causes

Status: **PLAN** | 2026-05-19

---

## P1 (High): Slice calculation bug blocks implement/verify phases

**File**: `benchtest/runners/WorkflowRunner.ts:185-188`

**Root cause**: The simulation-mode tool-per-phase slice calculation produces invalid ranges (start > end) for phase indices >= 2 when `expectedTools` has length 4.

```typescript
// Current (broken):
const toolsInPhase = this.scenario.expectedTools.slice(
  phaseIdx % this.scenario.expectedTools.length,
  (phaseIdx + 2) % this.scenario.expectedTools.length + 1,
);
```

| Phase | phaseIdx | `slice(start, end)` | Result |
|---|---|---|---|
| discover | 0 | `slice(0, 3)` | 3 tools, 3 model calls |
| plan | 1 | `slice(1, 4)` | 3 tools, 3 model calls |
| implement | 2 | `slice(2, 1)` | **empty** → `continue` → 0 tokens |
| verify | 3 | `slice(3, 2)` | **empty** → `continue` → 0 tokens |

**Fix**: Replace with circular wrapping that never produces invalid ranges.

```typescript
// Fix: circular wrap through expectedTools
const toolCount = Math.min(3, this.scenario.expectedTools.length);
const offset = (phaseIdx * 2) % this.scenario.expectedTools.length;
const toolsInPhase: string[] = [];
for (let i = 0; i < toolCount; i++) {
  toolsInPhase.push(
    this.scenario.expectedTools[(offset + i) % this.scenario.expectedTools.length]!
  );
}
```

**Verification**:
```bash
BENCHTEST_ENABLED=1 npm run benchtest -- --scenario bug-fix
```
Expected: implement phase tokens > 0, verify phase tokens > 0.

**Risk**: Low. Logic change confined to simulation mode only (non-realHTTP path).

---

## P2 (Medium): 6 config-only scenarios have no implementation

**Files**: `benchtest/config.ts` (SCENARIOS), `benchtest/scenarios/`, `benchtest/scenarios/index.ts`, `benchtest-run.mjs`

**Root cause**: `config.ts` SCENARIOS defines 14 entries, but only 8 have scenario implementation files and `getScenario()` entries. The 6 missing scenarios fall back to `fallbackScenario()` and aren't exercised by the runner.

| Missing scenario | Threshold tested | `DETECTOR_THRESHOLDS` key |
|---|---|---|
| `workflow-routing` | Latency ≤ 1500ms | `workflowRoutingMs` |
| `context-pack-size` | Handoff packs ≤ 120 lines | `contextPackMaxLines` |
| `plugin-hook-overhead` | Hooks ≤ 25ms per tool | `pluginHookMaxMs` |
| `rtk-compression-savings` | Savings ≥ 35% | `rtkMinSavingsRatio` |
| `verify-plan-accuracy` | Correct verify cmd selection | — |
| `reviewer-fanout-control` | Fanout ≤ 3 agents | `reviewerFanoutMax` |

**Fix**:

### Step 1: Create 6 scenario files in `benchtest/scenarios/`

<details>
<summary>Example: rtk-compression-savings.ts</summary>

```typescript
import type { Scenario } from './index.js';

export const rtkCompressionScenario: Scenario = {
  name: 'rtk-compression-savings',
  description: 'Tests RTK compression savings ratio threshold (≥ 35%)',
  taskPrompt: `Run the benchtest in simulation mode and verify RTK compression:
1. Execute: BENCHTEST_ENABLED=1 npm run benchtest -- --scenario code-review
2. Check benchtest-out/ JSON for rtkFilter and rtkSavedBytes metrics
3. Report the compression savings ratio and whether it meets the 35% threshold`,
  expectedPhases: ['discover', 'plan', 'verify'],
  expectedTools: ['bash', 'read', 'grep'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
```
</details>

Create analogous files for: `workflow-routing.ts`, `context-pack-size.ts`, `plugin-hook-overhead.ts`, `verify-plan-accuracy.ts`, `reviewer-fanout-control.ts`.

### Step 2: Register in `benchtest/scenarios/index.ts`

```typescript
// Add exports:
export { workflowRoutingScenario } from './workflow-routing.js';
export { contextPackSizeScenario } from './context-pack-size.js';
export { pluginHookOverheadScenario } from './plugin-hook-overhead.js';
export { rtkCompressionScenario } from './rtk-compression-savings.js';
export { verifyPlanAccuracyScenario } from './verify-plan-accuracy.js';
export { reviewerFanoutControlScenario } from './reviewer-fanout-control.js';

// Add switch cases in getScenario():
case 'workflow-routing': return workflowRoutingScenario;
case 'context-pack-size': return contextPackSizeScenario;
case 'plugin-hook-overhead': return pluginHookOverheadScenario;
case 'rtk-compression-savings': return rtkCompressionScenario;
case 'verify-plan-accuracy': return verifyPlanAccuracyScenario;
case 'reviewer-fanout-control': return reviewerFanoutControlScenario;
```

Remove duplicate imports at bottom of file (lines 42-49).

### Step 3: Add to `benchtest-run.mjs` SCENARIOS_LIST

Add the 6 scenario names to the existing array.

**Verification**:
```bash
npm run typecheck -w benchtest
BENCHTEST_ENABLED=1 npm run benchtest -- --scenario rtk-compression-savings
```

**Risk**: Low. Only new test scenario files, no production code modified.

---

## P3 (Low): RTK threshold alerts in simulation mode

**File**: `benchtest/detectors/index.ts` (or relevant detector)

**Root cause**: `rtkMinSavingsRatio: 0.35` is enforced in simulation mode where random data generates no repetitive patterns for RTK to compress. The 14-25% observed "savings" come from runner console output RTK compression, not from scenario tool output.

**Fix**: Skip the RTK savings ratio check when running in simulation mode. The threshold is designed for real agent sessions with repetitive output (verification logs, error messages, code blocks).

```typescript
// In the detector that checks rtkMinSavingsRatio:
const isSimulation = !this.options?.realHTTP; // or equivalent flag
if (!isSimulation && savingsRatio < DETECTOR_THRESHOLDS.rtkMinSavingsRatio) {
  // alert
}
```

**Verification**: Run full benchtest → RTK alerts = 0 in simulation mode.

**Risk**: None. Threshold enforcement preserved for `realHTTP` mode.

---

## Execution Order & Dependency

```
P1 (fix slice bug) -------> verify bug-fix/refactor reach implement+verify
  |
  +-- independent - no dependency on P2 or P3

P2 (add scenarios) ------> complete scenario coverage, unblock P3 verification
  |
  +-- depends on P1 for correct simulation (P2 scenarios will use simulation mode too)
  
P3 (RTK threshold) -----> remove false alerts
  |
  +-- depends on P2 for proper rtk-compression-savings scenario
```

**Recommended order**: P1 → P2 → P3

---

## Verification Checklist

| # | Check | Command |
|---|---|---|
| 1 | TypeScript compiles | `npm run typecheck -w benchtest` |
| 2 | Benchmark tests pass | `npm run test -w benchtest` |
| 3 | P1: bug-fix has implement/verify tokens | `npm run benchtest -- --scenario bug-fix` |
| 4 | P1: refactor has implement/verify tokens | `npm run benchtest -- --scenario refactor` |
| 5 | P2: All 6 new scenarios run without error | `npm run benchtest -- --scenario rtk-compression-savings` (×6) |
| 6 | P2: Full benchtest runs 14 scenarios | `npm run benchtest -- --scenario all` |
| 7 | P3: Zero RTK alerts in simulation mode | `npm run benchtest -- --scenario all` |
