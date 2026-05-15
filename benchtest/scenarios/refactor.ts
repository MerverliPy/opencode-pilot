import type { Scenario } from './index.js';

export const refactorScenario: Scenario = {
  name: 'refactor',
  description: 'Simulates a code refactor — understand module, plan changes, implement, typecheck',
  taskPrompt: `Refactor the MetricAggregator class to be more TypeScript-idiomatic:

Goals:
1. Replace the manual percentile calculation with a cleaner implementation
2. Add proper generic types for the summarize method
3. Make the HistogramBin type narrower (use template literal types for label)
4. Add JSDoc comments for all public methods
5. Ensure the refactor preserves 100% backward compatibility (same method signatures, same return shapes)

File to refactor: benchtest/collector/MetricAggregator.ts
Verify with: cat benchtest/collector/MetricAggregator.ts`,
  expectedPhases: ['discover', 'plan', 'implement', 'verify'],
  expectedTools: ['read', 'write', 'bash', 'grep'],
  tokenBudget: { maxTotal: 60_000, maxPerCall: 8_000 },
  timeoutMs: 180_000,
  iterations: 1,
};
