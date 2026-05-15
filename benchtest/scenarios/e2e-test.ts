import type { Scenario } from './index.js';

export const e2eTestScenario: Scenario = {
  name: 'e2e-test',
  description: 'Simulates writing an E2E test — discover patterns, write spec, verify syntax',
  taskPrompt: `Write a Playwright E2E test for the benchtest report generation:

Test requirements:
1. Navigate to the report page
2. Verify the summary cards render
3. Check that the token usage chart is present
4. Verify tool distribution section loads
5. Assert that any overconsumption alerts are displayed

Base the test on the existing pattern in e2e/tests/diagnostics/performance.spec.ts
The report is generated at the path specified by --out flag of benchtest-run.mjs
The test should use the page object model pattern from e2e/pages/

Write the file to benchtest/__tests__/report-ui.spec.ts
Then verify it typechecks with: npx tsc --noEmit -p benchtest/tsconfig.json`,
  expectedPhases: ['discover', 'plan', 'implement', 'verify'],
  expectedTools: ['read', 'write', 'bash', 'glob', 'grep'],
  tokenBudget: { maxTotal: 70_000, maxPerCall: 8_000 },
  timeoutMs: 240_000,
  iterations: 1,
};
