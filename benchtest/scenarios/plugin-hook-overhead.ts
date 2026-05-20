import type { Scenario } from './index.js';

export const pluginHookOverheadScenario: Scenario = {
  name: 'plugin-hook-overhead',
  description: 'Tests plugin hook per-tool latency threshold (≤ 25ms per tool)',
  taskPrompt: `Measure plugin hook overhead for tool execution:
1. Read benchtest/plugins/benchtest-plugin.ts to understand hook structure
2. Simulate 5 tool calls and measure plugin hook durations
3. Verify each hook completes within the 25ms per-tool threshold
4. Report any hooks exceeding the threshold`,
  expectedPhases: ['discover', 'verify'],
  expectedTools: ['read', 'bash', 'grep'],
  tokenBudget: { maxTotal: 30_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
