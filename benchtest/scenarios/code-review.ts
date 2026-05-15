import type { Scenario } from './index.js';

export const codeReviewScenario: Scenario = {
  name: 'code-review',
  description: 'Simulates a code review task — orchestrator discovers files, reads them, performs review',
  taskPrompt: `Review the following files for code quality issues, potential bugs, and adherence to TypeScript best practices.
Focus on: type safety, error handling, unused code, and performance concerns.
Provide a structured review with: Summary, Issues Found (with severity), Recommendations.

Files to review:
- benchtest/collector/MetricStore.ts
- benchtest/detectors/SpikeDetector.ts
- benchtest/config.ts`,
  expectedPhases: ['discover', 'review'],
  expectedTools: ['read', 'grep', 'glob', 'task'],
  tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 },
  timeoutMs: 120_000,
  iterations: 1,
};
