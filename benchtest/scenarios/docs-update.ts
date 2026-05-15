import type { Scenario } from './index.js';

export const docsUpdateScenario: Scenario = {
  name: 'docs-update',
  description: 'Simulates a documentation update — read existing docs, update, verify',
  taskPrompt: `Update the BENCHTEST.md documentation file to include the new token tracking features:

Tasks:
1. Read the existing BENCHTEST.md and benchtest/config.ts
2. Add a section documenting the TokenSummary report structure
3. Document the overconsumption detectors and their thresholds
4. Add an example of interpreting the token usage chart
5. Keep the tone consistent with existing docs

When done, verify the file was updated: head -50 BENCHTEST.md`,
  expectedPhases: ['discover', 'implement'],
  expectedTools: ['read', 'write', 'bash', 'grep'],
  tokenBudget: { maxTotal: 40_000, maxPerCall: 6_000 },
  timeoutMs: 120_000,
  iterations: 1,
};
