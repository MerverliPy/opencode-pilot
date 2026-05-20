import type { Scenario } from './index.js';

export const reviewerFanoutControlScenario: Scenario = {
  name: 'reviewer-fanout-control',
  description: 'Tests reviewer fanout control threshold (fanout ≤ 3 agents)',
  taskPrompt: `Verify reviewer fanout stays within the 3-agent limit:
1. Read benchtest/config.ts to understand DESTRUCTIVE_AGENTS and review agents
2. Simulate a code change touching 5 different risk surfaces
3. Check that the reviewer fanout logic limits to ≤ 3 agents
4. Report whether fanout control threshold is respected`,
  expectedPhases: ['discover', 'verify'],
  expectedTools: ['read', 'grep', 'task'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
