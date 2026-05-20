import type { Scenario } from './index.js';

export const contextPackSizeScenario: Scenario = {
  name: 'context-pack-size',
  description: 'Tests context pack size threshold (handoff packs ≤ 120 lines)',
  taskPrompt: `Verify context pack size limits for agent handoffs:
1. Read benchtest/runners/WorkflowRunner.ts to understand handoff patterns
2. Simulate building a context pack from the current repo state
3. Count the lines in a typical agent handoff context pack
4. Report whether packs stay under the 120-line threshold`,
  expectedPhases: ['discover', 'verify'],
  expectedTools: ['read', 'grep', 'bash'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
