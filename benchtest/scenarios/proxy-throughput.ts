import type { Scenario } from './index.js';

export const proxyThroughputScenario: Scenario = {
  name: 'proxy-throughput',
  description: 'Benchmarks SSE proxy streaming latency overhead on Pilot server',
  taskPrompt: `Run the proxy throughput benchmark against the Pilot server.
Measures SSE stream latency overhead vs direct endpoint access.`,
  expectedPhases: ['benchmark'],
  expectedTools: ['fetch'],
  tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
