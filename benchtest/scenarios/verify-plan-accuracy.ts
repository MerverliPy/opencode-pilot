import type { Scenario } from './index.js';

export const verifyPlanAccuracyScenario: Scenario = {
  name: 'verify-plan-accuracy',
  description: 'Tests verify-plan command selection accuracy',
  taskPrompt: `Verify that the verify-plan function selects the correct verification commands:
1. Read the pilot_verify_plan function implementation
2. Test with 3 different changed-file sets (server only, ui only, cross-workspace)
3. Confirm the verify command selection is appropriate for each file set
4. Report accuracy of verify command selection`,
  expectedPhases: ['discover', 'verify'],
  expectedTools: ['read', 'grep', 'bash'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
