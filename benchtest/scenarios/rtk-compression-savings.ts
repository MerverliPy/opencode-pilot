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
