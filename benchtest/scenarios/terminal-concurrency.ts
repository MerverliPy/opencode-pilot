import type { Scenario } from './index.js';

export const terminalConcurrencyScenario: Scenario = {
  name: 'terminal-concurrency',
  description: 'Benchmarks WebSocket connection throughput for Pilot terminal',
  taskPrompt: `Run the terminal concurrency benchmark.
Opens multiple concurrent WebSocket connections to Pilot terminal endpoint,
measures connection latency and throughput.`,
  expectedPhases: ['benchmark'],
  expectedTools: ['ws-connect'],
  tokenBudget: { maxTotal: 50_000, maxPerCall: 8_000 },
  timeoutMs: 60_000,
  iterations: 1,
};
