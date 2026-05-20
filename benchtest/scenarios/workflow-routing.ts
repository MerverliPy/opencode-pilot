import type { Scenario } from './index.js';

export const workflowRoutingScenario: Scenario = {
  name: 'workflow-routing',
  description: 'Tests workflow routing classification latency threshold (≤ 1500ms)',
  taskPrompt: `Exercise the workflow-routing system by classifying a set of PR diffs:
1. Read benchtest/config.ts to understand AGENT_PHASE_MAP
2. Classify 3 different changed-file sets through the routing logic
3. Measure and report classification latency for each
4. Verify routing decisions match expected phase assignments`,
  expectedPhases: ['discover', 'routing'],
  expectedTools: ['read', 'grep', 'glob'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
