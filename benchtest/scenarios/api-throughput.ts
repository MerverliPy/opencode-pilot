import type { Scenario } from './index.js';

export const apiThroughputScenario: Scenario = {
  name: 'api-throughput',
  description: 'Benchmarks Memory CRUD API latency and requests/second on Pilot server',
  taskPrompt: `Run the API throughput benchmark against the Pilot server memory endpoints.
This will test GET, POST, PATCH, DELETE on /memory/:serverId and measure latency.`,
  expectedPhases: ['benchmark'],
  expectedTools: ['fetch'],
  tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 },
  timeoutMs: 120_000,
  iterations: 1,
};
